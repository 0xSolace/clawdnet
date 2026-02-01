/**
 * Stripe Integration for ClawdNet
 * 
 * Handles:
 * - Stripe Connect for agent payouts
 * - Checkout sessions for paying agents
 * - Webhook processing
 * - Escrow flow management
 */

import Stripe from 'stripe';

// Server-side Stripe client (lazy init to avoid build errors)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Legacy export for compatibility - use getStripe() directly for full access
export const stripe = {
  get accounts() { return getStripe().accounts; },
  get accountLinks() { return getStripe().accountLinks; },
  get checkout() { return getStripe().checkout; },
  get paymentIntents() { return getStripe().paymentIntents; },
  get webhooks() { return getStripe().webhooks; },
  get balance() { return getStripe().balance; },
  get balanceTransactions() { return getStripe().balanceTransactions; },
  get customers() { return getStripe().customers; },
  get refunds() { return getStripe().refunds; },
  get transfers() { return getStripe().transfers; },
  get charges() { return getStripe().charges; },
};

// Platform fee percentage (e.g., 5%)
export const PLATFORM_FEE_PERCENT = 5;

// Minimum payout amount in cents
export const MIN_PAYOUT_AMOUNT = 100; // $1.00

/**
 * Create a Stripe Connect account for an agent
 */
export async function createConnectAccount(agentId: string, email?: string): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      clawdnet_agent_id: agentId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  
  return account;
}

/**
 * Create onboarding link for Stripe Connect
 */
export async function createOnboardingLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  
  return link.url;
}

/**
 * Check if a Connect account is fully onboarded
 */
export async function isAccountOnboarded(stripeAccountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return account.charges_enabled && account.payouts_enabled;
}

/**
 * Get Connect account dashboard link
 */
export async function getAccountDashboardLink(stripeAccountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  return link.url;
}

/**
 * Create a checkout session for paying an agent
 */
export async function createCheckoutSession(params: {
  agentId: string;
  agentHandle: string;
  agentStripeAccountId: string;
  userId: string;
  amount: number; // in cents
  currency?: string;
  description: string;
  taskId?: string;
  paymentType: 'task' | 'tip' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const {
    agentId,
    agentHandle,
    agentStripeAccountId,
    userId,
    amount,
    currency = 'usd',
    description,
    taskId,
    paymentType,
    successUrl,
    cancelUrl,
    metadata = {},
  } = params;

  // Calculate platform fee
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100);
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Payment to @${agentHandle}`,
            description,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: agentStripeAccountId,
      },
      metadata: {
        clawdnet_agent_id: agentId,
        clawdnet_user_id: userId,
        clawdnet_task_id: taskId || '',
        clawdnet_payment_type: paymentType,
        ...metadata,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      clawdnet_agent_id: agentId,
      clawdnet_user_id: userId,
      clawdnet_task_id: taskId || '',
      clawdnet_payment_type: paymentType,
      ...metadata,
    },
  });

  return session;
}

/**
 * Create a payment intent for escrow (hold funds without immediate transfer)
 */
export async function createEscrowPayment(params: {
  agentId: string;
  agentStripeAccountId: string;
  userId: string;
  amount: number; // in cents
  currency?: string;
  description: string;
  taskId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const {
    agentId,
    agentStripeAccountId,
    userId,
    amount,
    currency = 'usd',
    description,
    taskId,
    metadata = {},
  } = params;

  // Calculate platform fee
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100);

  // Create payment intent with manual capture for escrow
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    capture_method: 'manual', // Funds held until captured
    description,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: agentStripeAccountId,
    },
    metadata: {
      clawdnet_agent_id: agentId,
      clawdnet_user_id: userId,
      clawdnet_task_id: taskId,
      clawdnet_escrow: 'true',
      ...metadata,
    },
  });

  return paymentIntent;
}

/**
 * Release escrow funds to agent (capture the payment)
 */
export async function releaseEscrow(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
  return paymentIntent;
}

/**
 * Refund escrow funds to user (cancel the payment)
 */
export async function refundEscrow(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
  return paymentIntent;
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * List recent transfers to a Connect account
 */
export async function getAccountTransfers(
  stripeAccountId: string,
  limit = 10
): Promise<Stripe.Transfer[]> {
  const transfers = await stripe.transfers.list({
    destination: stripeAccountId,
    limit,
  });
  return transfers.data;
}

/**
 * Get account balance
 */
export async function getAccountBalance(stripeAccountId: string): Promise<Stripe.Balance> {
  return stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Supported webhook events
 */
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'account.updated',
  'transfer.created',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];
