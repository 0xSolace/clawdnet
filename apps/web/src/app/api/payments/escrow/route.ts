/**
 * Escrow payment management
 * 
 * POST /api/payments/escrow - Create escrow payment for a task
 * POST /api/payments/escrow/release - Release escrow to agent
 * POST /api/payments/escrow/refund - Refund escrow to user
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createEscrowPayment,
  releaseEscrow,
  refundEscrow,
  PLATFORM_FEE_PERCENT,
} from '@/lib/stripe';
import { supabase, createPayment, createFeedEvent } from '@/lib/db/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { errors, ErrorCode, errorResponse } from '@/lib/errors';

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
 * POST - Create escrow payment for a task
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return errors.unauthorized('Sign in at clawdnet.xyz to create escrow payments.');
    }

    const body = await req.json();
    const { agentHandle, amount, taskDescription, skillId } = body;

    if (!agentHandle || !amount || !skillId) {
      const missing = [];
      if (!agentHandle) missing.push('agentHandle');
      if (!amount) missing.push('amount');
      if (!skillId) missing.push('skillId');
      return errors.missingRequired(missing);
    }
    
    if (amount <= 0) {
      return errors.invalidAmount('Amount must be greater than 0.');
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, handle, name, stripe_account_id, stripe_onboarding_complete')
      .eq('handle', agentHandle)
      .single();

    if (agentError || !agent) {
      return errors.agentNotFound(agentHandle);
    }

    if (!agent.stripe_account_id || !agent.stripe_onboarding_complete) {
      return errors.paymentNotSetup(agent.handle);
    }

    const amountCents = Math.round(amount * 100);
    const platformFee = Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
    const netAmount = (amountCents - platformFee) / 100;

    // Create task record
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        requester_user_id: user.userId,
        provider_agent_id: agent.id,
        skill_id: skillId,
        description: taskDescription,
        agreed_price: amount.toString(),
        currency: 'USD',
        status: 'pending',
      })
      .select()
      .single();

    if (taskError) {
      console.error('Task creation error:', taskError);
      return errors.databaseError();
    }

    // Create payment record
    const payment = await createPayment({
      fromUserId: user.userId,
      toAgentId: agent.id,
      paymentType: 'task',
      amount: amount.toString(),
      currency: 'USD',
      description: taskDescription || `Task: ${skillId}`,
      metadata: {
        taskId: task.id,
        skillId,
        escrow: true,
        platformFee: platformFee / 100,
        netAmount,
      },
    });

    // Update task with payment reference
    await supabase
      .from('tasks')
      .update({ payment_id: payment.id })
      .eq('id', task.id);

    // Create Stripe escrow payment
    const paymentIntent = await createEscrowPayment({
      agentId: agent.id,
      agentStripeAccountId: agent.stripe_account_id,
      userId: user.userId,
      amount: amountCents,
      description: taskDescription || `Task: ${skillId}`,
      taskId: task.id,
      metadata: {
        clawdnet_payment_id: payment.id,
      },
    });

    // Update payment with Stripe details
    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        escrow_status: 'pending',
        platform_fee: (platformFee / 100).toString(),
        net_amount: netAmount.toString(),
        task_id: task.id,
      })
      .eq('id', payment.id);

    return NextResponse.json({
      taskId: task.id,
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      platformFee: platformFee / 100,
      netAmount,
    });
  } catch (error) {
    console.error('Escrow creation error:', error);
    return errors.internalError('creating escrow payment');
  }
}
