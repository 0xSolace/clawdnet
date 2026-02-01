'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Download,
  Calendar,
  Wallet,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AreaChart from '@/components/dashboard/charts/AreaChart';
import MetricCard from '@/components/dashboard/charts/MetricCard';
import TransactionHistory from '@/components/payments/TransactionHistory';

type TimePeriod = '7d' | '30d' | '90d' | 'all';

// Generate mock data for demo
function generateEarningsData(period: TimePeriod) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 180;
  
  const dailyEarnings = Array.from({ length: days }, (_, i) => ({
    label: `${days - i}d`,
    value: Math.floor(20 + Math.random() * 80 + Math.sin(i / 5) * 30),
  }));

  const totalRevenue = dailyEarnings.reduce((sum, d) => sum + d.value, 0);
  const prevPeriodRevenue = totalRevenue * 0.85;
  const change = ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100;

  return {
    totalRevenue,
    pendingPayout: Math.floor(totalRevenue * 0.15),
    lifetimeEarnings: totalRevenue * 3.5,
    change: Math.round(change),
    dailyEarnings,
    avgDaily: totalRevenue / days,
    topAgent: { handle: 'assistant', earnings: Math.floor(totalRevenue * 0.45) },
  };
}

export default function EarningsPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  
  const data = useMemo(() => generateEarningsData(period), [period]);

  const sparkline = useMemo(() => {
    return data.dailyEarnings.slice(-12).map((d) => d.value);
  }, [data]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-mono mb-1">Earnings</h1>
          <p className="text-zinc-500 text-sm">
            Track your revenue and manage payouts
          </p>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                period === p
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <MetricCard
          title={`Revenue (${period})`}
          value={`$${data.totalRevenue.toLocaleString()}`}
          change={data.change}
          icon={DollarSign}
          iconColor="text-green-400"
          sparkline={sparkline}
        />
        <MetricCard
          title="Pending Payout"
          value={`$${data.pendingPayout.toLocaleString()}`}
          icon={Wallet}
          iconColor="text-yellow-400"
        />
        <MetricCard
          title="Lifetime Earnings"
          value={`$${Math.floor(data.lifetimeEarnings).toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <MetricCard
          title="Avg Daily"
          value={`$${data.avgDaily.toFixed(2)}`}
          icon={Calendar}
          iconColor="text-cyan-400"
        />
      </motion.div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-950 border border-zinc-900 mb-6"
      >
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-mono">Revenue Over Time</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-white font-mono text-xs"
          >
            <Download className="w-3 h-3 mr-2" />
            Export CSV
          </Button>
        </div>
        <div className="p-6">
          <AreaChart
            data={data.dailyEarnings}
            height={240}
            color="#22c55e"
            fillColor="rgba(34, 197, 94, 0.1)"
            formatValue={(v) => `$${v}`}
          />
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-zinc-950 border border-zinc-900"
        >
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-mono">Transaction History</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-white font-mono text-xs"
            >
              View All
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="p-4">
            <TransactionHistory type="received" limit={8} />
          </div>
        </motion.div>

        {/* Payout Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Pending Payout */}
          <div className="bg-zinc-950 border border-zinc-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-white font-mono">Pending Payout</h3>
            </div>
            
            <div className="text-3xl font-bold text-green-400 font-mono mb-4">
              ${data.pendingPayout.toLocaleString()}
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Minimum threshold</span>
                <span className="text-zinc-400 font-mono">$10.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Payment method</span>
                <span className="text-zinc-400 font-mono">USDC (Base)</span>
              </div>
            </div>

            <Button
              className="w-full bg-primary text-black hover:bg-primary/90 font-mono"
              disabled={data.pendingPayout < 10}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Request Payout
            </Button>

            <p className="text-[10px] text-zinc-600 mt-3 text-center">
              Payouts are processed within 24 hours via X402
            </p>
          </div>

          {/* Top Earning Agent */}
          <div className="bg-zinc-950 border border-zinc-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-white font-mono">Top Earner</h3>
            </div>
            
            <div className="flex items-center gap-4 bg-zinc-900 p-4">
              <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">@{data.topAgent.handle}</div>
                <div className="text-sm text-green-400 font-mono">
                  ${data.topAgent.earnings.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-zinc-950 border border-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-2">
              Have questions about payments?
            </p>
            <a
              href="/docs/payments"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-mono"
            >
              View documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
