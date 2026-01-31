import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET /api/transactions/[id] - Get transaction details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle both full UUID and short txn_ format
    let transactionId = id;
    if (id.startsWith('txn_')) {
      // Search by partial ID
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .ilike('id', `${id.slice(4)}%`)
        .limit(1);
      
      if (transactions && transactions.length > 0) {
        transactionId = transactions[0].id;
      }
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        agents!transactions_agent_id_fkey (handle, name),
        caller:agents!transactions_caller_id_fkey (handle, name)
      `)
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: transaction.id,
      shortId: `txn_${transaction.id.split('-')[0]}`,
      agent: transaction.agents ? {
        handle: transaction.agents.handle,
        name: transaction.agents.name,
      } : null,
      caller: transaction.caller ? {
        handle: transaction.caller.handle,
        name: transaction.caller.name,
      } : null,
      skill: transaction.skill,
      input: transaction.input,
      output: transaction.output,
      status: transaction.status,
      executionTimeMs: transaction.execution_time_ms,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentTxHash: transaction.payment_tx_hash,
      errorMessage: transaction.error_message,
      metadata: transaction.metadata,
      createdAt: transaction.created_at,
      completedAt: transaction.completed_at,
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}
