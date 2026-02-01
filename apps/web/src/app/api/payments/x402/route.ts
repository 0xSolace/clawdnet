/**
 * POST /api/payments/x402
 * Create an x402 payment request for an agent
 * 
 * Returns 402 Payment Required with payment details
 * Client should pay via x402 protocol and retry with payment header
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, createPayment } from '@/lib/db/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import {
  createPaymentRequirements,
  create402Response,
  verifyPayment,
  getAgentPaymentConfig,
  X402_PLATFORM_FEE_PERCENT,
} from '@/lib/x402';

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

export async function POST(req: NextRequest) {
  try {
    // Check if this is a payment verification (has X-Payment header)
    const paymentHeader = req.headers.get('X-Payment') || req.headers.get('payment-signature');
    
    if (paymentHeader) {
      // Verify the payment
      return handlePaymentVerification(req, paymentHeader);
    }

    // Otherwise, create a new payment request (return 402)
    return handlePaymentRequest(req);
  } catch (error) {
    console.error('x402 payment error:', error);
    return NextResponse.json(
      { error: 'x402 payment failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentRequest(req: NextRequest) {
  const user = await getUser(req);
  // For x402, user auth is optional - payments are wallet-based
  
  const body = await req.json();
  const {
    agentHandle,
    amount, // in dollars
    paymentType = 'tip',
    description,
    skillId,
  } = body;

  if (!agentHandle || !amount || amount <= 0) {
    return NextResponse.json(
      { error: 'Agent handle and positive amount required' },
      { status: 400 }
    );
  }

  // Get agent details
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, handle, name, agent_wallet, x402_support, stripe_account_id, stripe_onboarding_complete')
    .eq('handle', agentHandle)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Check x402 support
  const paymentConfig = getAgentPaymentConfig(agent);
  
  if (!paymentConfig.x402Enabled) {
    // Fallback info for Stripe
    if (paymentConfig.stripeEnabled) {
      return NextResponse.json({
        error: 'x402 not available',
        message: 'This agent only accepts Stripe payments',
        fallback: 'stripe',
        checkoutUrl: `/api/payments/checkout`,
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Agent has not set up crypto payments' },
      { status: 400 }
    );
  }

  // Calculate platform fee
  const platformFee = amount * (X402_PLATFORM_FEE_PERCENT / 100);
  const netAmount = amount - platformFee;

  // Create payment record in pending state
  const payment = await createPayment({
    fromUserId: user?.userId,
    toAgentId: agent.id,
    paymentType,
    amount: amount.toString(),
    currency: 'USDC',
    description: description || `x402 payment to @${agent.handle}`,
    platformFee: platformFee.toString(),
    netAmount: netAmount.toString(),
    metadata: { 
      skillId,
      protocol: 'x402',
      network: 'base',
    },
  });

  // Create x402 payment requirements
  const requirements = createPaymentRequirements({
    receiverWallet: agent.agent_wallet!,
    amountUsd: amount,
    description: description || `Payment to @${agent.handle}`,
    skillId,
    agentHandle: agent.handle,
  });

  // Add payment ID to metadata for tracking
  const enhancedRequirements = {
    ...requirements,
    metadata: {
      ...requirements.metadata,
      clawdnetPaymentId: payment.id,
    },
  };

  // Return 402 with payment requirements
  return create402Response(enhancedRequirements);
}

async function handlePaymentVerification(req: NextRequest, paymentHeader: string) {
  try {
    // Verify the payment
    const verification = await verifyPayment(req);
    
    if (!verification.valid) {
      return NextResponse.json({
        error: 'Payment verification failed',
        details: verification.error,
      }, { status: 402 });
    }

    // Extract payment ID from the original request
    const body = await req.json().catch(() => ({}));
    const paymentId = body.paymentId;

    if (paymentId) {
      // Update payment record
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          external_id: verification.txHash,
          completed_at: new Date().toISOString(),
          metadata: {
            payer: verification.payer,
            txHash: verification.txHash,
            verifiedAt: Date.now(),
          },
        })
        .eq('id', paymentId);
    }

    return NextResponse.json({
      success: true,
      payment: {
        verified: true,
        payer: verification.payer,
        amount: verification.amount,
        txHash: verification.txHash,
        paymentId,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 402 });
  }
}

/**
 * GET /api/payments/x402
 * Get x402 payment info for an agent
 */
export async function GET(req: NextRequest) {
  const agentHandle = req.nextUrl.searchParams.get('agent');
  
  if (!agentHandle) {
    return NextResponse.json({ error: 'Agent handle required' }, { status: 400 });
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, handle, name, agent_wallet, x402_support, stripe_account_id, stripe_onboarding_complete')
    .eq('handle', agentHandle)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const paymentConfig = getAgentPaymentConfig(agent);

  return NextResponse.json({
    agentHandle: agent.handle,
    agentName: agent.name,
    paymentMethods: {
      x402: paymentConfig.x402Enabled,
      stripe: paymentConfig.stripeEnabled,
      preferred: paymentConfig.preferredMethod,
    },
    x402: paymentConfig.x402Enabled ? {
      walletAddress: paymentConfig.walletAddress,
      network: 'base',
      asset: 'USDC',
    } : null,
  });
}
