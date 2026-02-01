/**
 * GET /api/payments/balance
 * Get on-chain USDC balance and recent transactions for an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { getUsdcBalance, getRecentTransfers, getAgentPaymentConfig } from '@/lib/x402';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

async function getUser(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('clawdnet_auth')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; walletAddress: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentHandle = req.nextUrl.searchParams.get('agent');
    const includeTransfers = req.nextUrl.searchParams.get('transfers') !== 'false';
    
    if (!agentHandle) {
      return NextResponse.json({ error: 'Agent handle required' }, { status: 400 });
    }

    // Get agent and verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, handle, name, owner_id, agent_wallet, x402_support, stripe_account_id, stripe_onboarding_complete')
      .eq('handle', agentHandle)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.owner_id !== user.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const paymentConfig = getAgentPaymentConfig(agent);

    // If no x402 wallet, return empty balance
    if (!paymentConfig.x402Support || !paymentConfig.agentWallet) {
      return NextResponse.json({
        agentHandle: agent.handle,
        x402Enabled: false,
        balance: null,
        transfers: [],
        message: 'x402 payments not configured. Add a wallet address to enable.',
      });
    }

    // Get on-chain USDC balance
    const usdcBalance = await getUsdcBalance(paymentConfig.agentWallet);

    // Get recent transfers if requested
    let transfers: Array<{
      from: string;
      to: string;
      value: string;
      valueFormatted: string;
      transactionHash: string;
      blockNumber: bigint;
    }> = [];
    
    if (includeTransfers) {
      transfers = await getRecentTransfers(paymentConfig.agentWallet, 20);
    }

    // Get database payment totals
    const { data: paymentStats } = await supabase
      .from('payments')
      .select('amount, currency, status')
      .eq('to_agent_id', agent.id)
      .eq('status', 'completed');

    const totalReceived = paymentStats?.reduce((sum, p) => {
      return sum + parseFloat(p.amount);
    }, 0) || 0;

    const usdcReceived = paymentStats?.filter(p => p.currency === 'USDC').reduce((sum, p) => {
      return sum + parseFloat(p.amount);
    }, 0) || 0;

    return NextResponse.json({
      agentHandle: agent.handle,
      x402Enabled: true,
      wallet: {
        address: paymentConfig.agentWallet,
        network: 'base',
        asset: 'USDC',
      },
      balance: {
        usdc: usdcBalance.balance,
        formatted: `$${usdcBalance.balanceFormatted}`,
      },
      stats: {
        totalReceived: totalReceived,
        usdcReceived: usdcReceived,
        transactionCount: paymentStats?.length || 0,
      },
      transfers: transfers.map(t => ({
        from: t.from,
        to: t.to,
        amount: t.valueFormatted,
        txHash: t.transactionHash,
        explorerUrl: `https://basescan.org/tx/${t.transactionHash}`,
      })),
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
