/**
 * POST /api/payments/checkout
 * Create a Stripe checkout session to pay an agent
 * Also returns x402 info if available for the agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { supabase, createPayment } from '@/lib/db/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { getAgentPaymentConfig, createPaymentRequirements } from '@/lib/x402';

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
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      agentHandle,
      amount, // in dollars
      paymentType = 'tip',
      description,
      taskId,
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
      .select('id, handle, name, stripe_account_id, stripe_onboarding_complete')
      .eq('handle', agentHandle)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get payment config
    const paymentConfig = getAgentPaymentConfig(agent);
    
    if (!paymentConfig.stripeEnabled) {
      // If no Stripe, check for x402
      if (paymentConfig.x402Enabled) {
        // Return x402 payment info instead
        const requirements = createPaymentRequirements({
          receiverWallet: paymentConfig.walletAddress!,
          amountUsd: amount,
          description: description || `Payment to @${agent.handle}`,
          agentHandle: agent.handle,
        });
        
        return NextResponse.json({
          error: 'Stripe not available',
          message: 'This agent accepts crypto payments via x402',
          x402: {
            available: true,
            walletAddress: paymentConfig.walletAddress,
            network: 'base',
            asset: 'USDC',
            requirements,
          },
        }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: 'Agent has not set up payments yet' },
        { status: 400 }
      );
    }

    // Convert dollars to cents
    const amountCents = Math.round(amount * 100);

    // Create payment record in pending state
    const payment = await createPayment({
      fromUserId: user.userId,
      toAgentId: agent.id,
      paymentType,
      amount: amount.toString(),
      currency: 'USD',
      description: description || `Payment to @${agent.handle}`,
      metadata: { taskId },
    });

    // Create Stripe checkout session
    const baseUrl = req.nextUrl.origin;
    const session = await createCheckoutSession({
      agentId: agent.id,
      agentHandle: agent.handle,
      agentStripeAccountId: agent.stripe_account_id,
      userId: user.userId,
      amount: amountCents,
      description: description || `Payment to @${agent.handle}`,
      taskId,
      paymentType,
      successUrl: `${baseUrl}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`,
      cancelUrl: `${baseUrl}/agent/${agent.handle}?payment=cancelled`,
      metadata: {
        clawdnet_payment_id: payment.id,
      },
    });

    // Update payment with stripe session id
    await supabase
      .from('payments')
      .update({ 
        stripe_payment_intent_id: session.payment_intent as string,
        metadata: { ...payment.metadata, stripe_session_id: session.id }
      })
      .eq('id', payment.id);

    // Include x402 as alternative if available
    const response: any = {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: payment.id,
    };
    
    if (paymentConfig.x402Enabled) {
      response.x402Alternative = {
        available: true,
        walletAddress: paymentConfig.walletAddress,
        network: 'base',
        asset: 'USDC',
        endpoint: '/api/payments/x402',
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
