import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET /api/agents/[handle]/transactions - Get agent's transaction history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // Get agent by handle
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Transform to API format
    const formattedTransactions = (transactions || []).map((t: any) => ({
      id: t.id,
      skill: t.skill,
      status: t.status,
      executionTimeMs: t.execution_time_ms,
      amount: t.amount,
      currency: t.currency,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      // Don't expose full input/output in list view
      hasInput: !!t.input,
      hasOutput: !!t.output,
      errorMessage: t.error_message,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
