/**
 * GET /api/payments/history
 * Get payment history for user or agent
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const agentHandle = searchParams.get('agent');
    const type = searchParams.get('type') as 'sent' | 'received' | 'all' || 'all';
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('payments')
      .select(`
        *,
        from_user:users!payments_from_user_id_fk(id, handle, name, avatar_url),
        to_agent:agents!payments_to_agent_id_fk(id, handle, name, avatar_url),
        from_agent:agents!payments_from_agent_id_fk(id, handle, name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // If agent handle provided, get payments for that agent (if owned by user)
    if (agentHandle) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('handle', agentHandle)
        .eq('owner_id', user.userId)
        .single();

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found or not owned by you' }, { status: 404 });
      }

      if (type === 'received') {
        query = query.eq('to_agent_id', agent.id);
      } else if (type === 'sent') {
        query = query.eq('from_agent_id', agent.id);
      } else {
        query = query.or(`to_agent_id.eq.${agent.id},from_agent_id.eq.${agent.id}`);
      }
    } else {
      // Get payments for user
      if (type === 'sent') {
        query = query.eq('from_user_id', user.userId);
      } else if (type === 'received') {
        // Get user's agents first
        const { data: userAgents } = await supabase
          .from('agents')
          .select('id')
          .eq('owner_id', user.userId);

        if (userAgents && userAgents.length > 0) {
          const agentIds = userAgents.map(a => a.id);
          query = query.in('to_agent_id', agentIds);
        } else {
          // No agents, no received payments
          return NextResponse.json({ payments: [], total: 0 });
        }
      } else {
        // All payments involving user
        const { data: userAgents } = await supabase
          .from('agents')
          .select('id')
          .eq('owner_id', user.userId);

        const agentIds = userAgents?.map(a => a.id) || [];
        
        if (agentIds.length > 0) {
          query = query.or(
            `from_user_id.eq.${user.userId},to_agent_id.in.(${agentIds.join(',')}),from_agent_id.in.(${agentIds.join(',')})`
          );
        } else {
          query = query.eq('from_user_id', user.userId);
        }
      }
    }

    // Status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Payment history error:', error);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Format payments
    const formattedPayments = payments?.map(p => ({
      id: p.id,
      type: p.payment_type,
      status: p.status,
      escrowStatus: p.escrow_status,
      amount: parseFloat(p.amount),
      netAmount: p.net_amount ? parseFloat(p.net_amount) : null,
      platformFee: p.platform_fee ? parseFloat(p.platform_fee) : null,
      currency: p.currency,
      description: p.description,
      fromUser: p.from_user ? {
        handle: p.from_user.handle,
        name: p.from_user.name,
        avatarUrl: p.from_user.avatar_url,
      } : null,
      toAgent: p.to_agent ? {
        handle: p.to_agent.handle,
        name: p.to_agent.name,
        avatarUrl: p.to_agent.avatar_url,
      } : null,
      fromAgent: p.from_agent ? {
        handle: p.from_agent.handle,
        name: p.from_agent.name,
        avatarUrl: p.from_agent.avatar_url,
      } : null,
      taskId: p.task_id,
      createdAt: p.created_at,
      completedAt: p.completed_at,
    }));

    return NextResponse.json({
      payments: formattedPayments || [],
      total: count || formattedPayments?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Payment history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
