'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Payment {
  id: string;
  type: 'task' | 'tip' | 'subscription' | 'collaboration';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  escrowStatus?: 'held' | 'released' | 'refunded';
  amount: number;
  netAmount?: number;
  platformFee?: number;
  currency: string;
  description?: string;
  fromUser?: { handle: string; name: string; avatarUrl?: string };
  toAgent?: { handle: string; name: string; avatarUrl?: string };
  fromAgent?: { handle: string; name: string; avatarUrl?: string };
  taskId?: string;
  createdAt: string;
  completedAt?: string;
}

interface TransactionHistoryProps {
  agentHandle?: string;
  type?: 'sent' | 'received' | 'all';
  limit?: number;
  showLoadMore?: boolean;
}

export default function TransactionHistory({
  agentHandle,
  type = 'all',
  limit = 10,
  showLoadMore = true,
}: TransactionHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchPayments(0, true);
  }, [agentHandle, type]);

  async function fetchPayments(newOffset: number, reset = false) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        offset: newOffset.toString(),
      });
      if (agentHandle) {
        params.set('agent', agentHandle);
      }

      const res = await fetch(`/api/payments/history?${params}`);
      const data = await res.json();

      if (reset) {
        setPayments(data.payments || []);
      } else {
        setPayments((prev) => [...prev, ...(data.payments || [])]);
      }

      setHasMore((data.payments?.length || 0) >= limit);
      setOffset(newOffset + (data.payments?.length || 0));
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const getStatusIcon = (status: string, escrowStatus?: string) => {
    if (escrowStatus === 'held') {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'refunded':
        return <XCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusLabel = (status: string, escrowStatus?: string) => {
    if (escrowStatus === 'held') return 'In Escrow';
    if (escrowStatus === 'released') return 'Released';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
        <p className="text-zinc-500 text-sm font-mono">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {payments.map((payment, i) => {
        const isReceived = payment.toAgent && type !== 'sent';
        const counterparty = isReceived
          ? payment.fromUser || payment.fromAgent
          : payment.toAgent;

        return (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-colors"
          >
            {/* Direction indicator */}
            <div
              className={`w-10 h-10 flex items-center justify-center ${
                isReceived ? 'bg-green-500/10' : 'bg-zinc-900'
              }`}
            >
              {isReceived ? (
                <ArrowDownLeft className="w-5 h-5 text-green-400" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-zinc-400" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm truncate">
                  {isReceived ? 'From' : 'To'} @{counterparty?.handle || 'unknown'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 font-mono uppercase ${
                    payment.type === 'tip'
                      ? 'bg-purple-500/20 text-purple-400'
                      : payment.type === 'task'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {payment.type}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(payment.status, payment.escrowStatus)}
                <span className="text-xs text-zinc-500">
                  {getStatusLabel(payment.status, payment.escrowStatus)}
                </span>
                <span className="text-xs text-zinc-700">•</span>
                <span className="text-xs text-zinc-600">
                  {formatDate(payment.createdAt)}
                </span>
              </div>
              {payment.description && (
                <p className="text-xs text-zinc-600 mt-1 truncate">
                  {payment.description}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="text-right">
              <div
                className={`font-mono text-lg font-bold ${
                  isReceived ? 'text-green-400' : 'text-white'
                }`}
              >
                {isReceived ? '+' : '-'}${payment.amount.toFixed(2)}
              </div>
              {payment.netAmount && payment.netAmount !== payment.amount && (
                <div className="text-[10px] text-zinc-600 font-mono">
                  Net: ${payment.netAmount.toFixed(2)}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Load more */}
      {showLoadMore && hasMore && (
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => fetchPayments(offset)}
            disabled={loadingMore}
            className="w-full border-zinc-800 text-zinc-500 hover:text-white font-mono"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ChevronDown className="w-4 h-4 mr-2" />
            )}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
