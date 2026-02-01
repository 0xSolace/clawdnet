/**
 * Stripe Connect endpoints for agent onboarding
 * 
 * POST /api/payments/connect - Start Connect onboarding
 * GET /api/payments/connect - Get Connect status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createConnectAccount,
  createOnboardingLink,
  isAccountOnboarded,
  getAccountDashboardLink,
  getAccountBalance,
} from '@/lib/stripe';
import { supabase } from '@/lib/db/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';

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

/**
 * GET - Get Connect account status for user's agent
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentHandle = req.nextUrl.searchParams.get('agent');
    if (!agentHandle) {
      return NextResponse.json({ error: 'Agent handle required' }, { status: 400 });
    }

    // Get agent owned by user
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, handle, stripe_account_id, stripe_onboarding_complete, payout_enabled')
      .eq('handle', agentHandle)
      .eq('owner_id', user.userId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found or not owned by you' }, { status: 404 });
    }

    if (!agent.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        onboardingComplete: false,
        payoutEnabled: false,
      });
    }

    // Check current status
    const onboarded = await isAccountOnboarded(agent.stripe_account_id);
    
    // Get balance if onboarded
    let balance = null;
    let dashboardUrl = null;
    if (onboarded) {
      try {
        const balanceData = await getAccountBalance(agent.stripe_account_id);
        balance = {
          available: balanceData.available.map(b => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
          pending: balanceData.pending.map(b => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
        };
        dashboardUrl = await getAccountDashboardLink(agent.stripe_account_id);
      } catch (e) {
        console.error('Failed to get balance:', e);
      }
    }

    return NextResponse.json({
      connected: true,
      onboardingComplete: onboarded,
      payoutEnabled: agent.payout_enabled,
      balance,
      dashboardUrl,
    });
  } catch (error) {
    console.error('Connect status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Connect status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or continue Connect onboarding
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentHandle, email } = body;

    if (!agentHandle) {
      return NextResponse.json({ error: 'Agent handle required' }, { status: 400 });
    }

    // Get agent owned by user
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, handle, stripe_account_id')
      .eq('handle', agentHandle)
      .eq('owner_id', user.userId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found or not owned by you' }, { status: 404 });
    }

    const baseUrl = req.nextUrl.origin;
    let stripeAccountId = agent.stripe_account_id;

    // Create Connect account if doesn't exist
    if (!stripeAccountId) {
      const account = await createConnectAccount(agent.id, email);
      stripeAccountId = account.id;

      // Save to database
      await supabase
        .from('agents')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', agent.id);
    }

    // Create onboarding link
    const onboardingUrl = await createOnboardingLink(
      stripeAccountId,
      `${baseUrl}/dashboard/settings?stripe=complete&agent=${agentHandle}`,
      `${baseUrl}/dashboard/settings?stripe=refresh&agent=${agentHandle}`
    );

    return NextResponse.json({
      onboardingUrl,
      stripeAccountId,
    });
  } catch (error) {
    console.error('Connect onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    );
  }
}
