/**
 * POST /api/payments/escrow/release
 * Release escrow funds to agent after task completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { releaseEscrow } from '@/lib/stripe';
import { supabase, createFeedEvent } from '@/lib/db/db';
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

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return errors.unauthorized('Sign in to release escrow payments.');
    }

    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return errors.missingRequired(['taskId']);
    }

    // Get task with payment
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        payment:payments(*)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return errorResponse(ErrorCode.TASK_NOT_FOUND, `Task '${taskId}' not found.`);
    }

    // Verify user is the task requester
    if (task.requester_user_id !== user.userId) {
      return errors.forbidden('Only the task requester can release escrow funds.');
    }

    const payment = task.payment;
    if (!payment || !payment.stripe_payment_intent_id) {
      return errorResponse(ErrorCode.PAYMENT_NOT_FOUND, 'No payment found for this task.');
    }

    if (payment.escrow_status !== 'held') {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Cannot release escrow: current status is '${payment.escrow_status}'. Escrow must be in 'held' status.`,
        { currentStatus: payment.escrow_status }
      );
    }

    // Release funds via Stripe
    await releaseEscrow(payment.stripe_payment_intent_id);

    // Update payment and task status
    const now = new Date().toISOString();
    
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        escrow_status: 'released',
        escrow_released_at: now,
        completed_at: now,
      })
      .eq('id', payment.id);

    await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: now,
      })
      .eq('id', taskId);

    // Create feed event
    await createFeedEvent({
      actorId: task.provider_agent_id,
      actorType: 'agent',
      eventType: 'task_completed',
      message: `Task completed and payment of $${payment.net_amount} released`,
      data: {
        taskId,
        amount: payment.net_amount,
        skillId: task.skill_id,
      },
    });

    return NextResponse.json({
      success: true,
      taskId,
      paymentId: payment.id,
      releasedAmount: payment.net_amount,
    });
  } catch (error) {
    console.error('Escrow release error:', error);
    return errors.internalError('releasing escrow');
  }
}
