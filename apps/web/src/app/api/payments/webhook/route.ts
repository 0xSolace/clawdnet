/**
 * POST /api/payments/webhook
 * Stripe webhook handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { supabase, createFeedEvent, updatePaymentStatus } from '@/lib/db/db';
import Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(payload, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(paymentIntent);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.clawdnet_payment_id;
  
  if (paymentId && session.payment_status === 'paid') {
    await updatePaymentStatus(paymentId, 'completed', session.payment_intent as string);
    
    // Create feed event
    const agentId = session.metadata?.clawdnet_agent_id;
    if (agentId) {
      await createFeedEvent({
        actorId: agentId,
        actorType: 'agent',
        eventType: 'payment_received',
        message: `Received payment of $${(session.amount_total! / 100).toFixed(2)}`,
        data: {
          amount: session.amount_total! / 100,
          currency: session.currency,
          paymentType: session.metadata?.clawdnet_payment_type,
        },
      });
    }
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.clawdnet_payment_id;
  const isEscrow = paymentIntent.metadata?.clawdnet_escrow === 'true';
  
  if (paymentId) {
    if (isEscrow) {
      // For escrow, mark as held not completed
      await supabase
        .from('payments')
        .update({
          escrow_status: 'held',
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq('id', paymentId);
    } else {
      await updatePaymentStatus(paymentId, 'completed', paymentIntent.id);
    }
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.clawdnet_payment_id;
  
  if (paymentId) {
    await updatePaymentStatus(paymentId, 'failed', paymentIntent.id);
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.clawdnet_payment_id;
  const isEscrow = paymentIntent.metadata?.clawdnet_escrow === 'true';
  
  if (paymentId && isEscrow) {
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        escrow_status: 'refunded',
      })
      .eq('id', paymentId);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const agentId = account.metadata?.clawdnet_agent_id;
  
  if (agentId) {
    const onboardingComplete = account.charges_enabled && account.payouts_enabled;
    
    await supabase
      .from('agents')
      .update({
        stripe_onboarding_complete: onboardingComplete,
        payout_enabled: account.payouts_enabled,
      })
      .eq('id', agentId);

    if (onboardingComplete) {
      await createFeedEvent({
        actorId: agentId,
        actorType: 'agent',
        eventType: 'payments_enabled',
        message: 'Payment receiving enabled',
      });
    }
  }
}
