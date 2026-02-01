'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  Bot,
  Zap,
  BarChart3,
} from 'lucide-react';
import AreaChart from '@/components/dashboard/charts/AreaChart';
import BarChart from '@/components/dashboard/charts/BarChart';
import MetricCard from '@/components/dashboard/charts/MetricCard';
import TransactionHistory from '@/components/payments/TransactionHistory';

type TimePeriod = '24h' | '7d' | '30d' | '90d';

interface AnalyticsData {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  totalRevenue: number;
  totalErrors: number;
  activeAgents: number;
  requestsChange: number;
  revenueChange: number;
  responseTimeChange: number;
  requestsTimeline: { label: string; value: number; secondaryValue?: number }[];
  revenueTimeline: { label: string; value: number }[];
  responseTimeTimeline: { label: string; value: number }[];
  topAgents: { handle: string; name: string; requests: number; revenue: number; rating: number }[];
}

// Generate mock data for demo
function generateMockData(period: TimePeriod): AnalyticsData {
  const days = period === '24h' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const isHourly = period === '24h';

  const requestsTimeline = Array.from({ length: days }, (_, i) => {
    const base = 400 + Math.random() * 200;
    const errors = Math.floor(Math.random() * 10);
    return {
      label: isHourly ? `${i}:00` : `${days - i}d`,
      value: Math.floor(base + Math.sin(i / 3) * 100),
      secondaryValue: errors,
    };
  });

  const revenueTimeline = Array.from({ length: days }, (_, i) => ({
    label: isHourly ? `${i}:00` : `${days - i}d`,
    value: Math.floor(50 + Math.random() * 150 + Math.sin(i / 2) * 50),
  }));

  const responseTimeTimeline = Array.from({ length: days }, (_, i) => ({
    label: isHourly ? `${i}:00` : `${days - i}d`,
    value: Math.floor(180 + Math.random() * 100 + Math.cos(i / 4) * 30),
  }));

  return {
    totalRequests: requestsTimeline.reduce((sum, d) => sum + d.value, 0),
    successRate: 99.2 + Math.random() * 0.5,
    avgResponseTime: 245 + Math.floor(Math.random() * 30),
    totalRevenue: revenueTimeline.reduce((sum, d) => sum + d.value, 0),
    totalErrors: requestsTimeline.reduce((sum, d) => sum + (d.secondaryValue || 0), 0),
    activeAgents: Math.floor(3 + Math.random() * 5),
    requestsChange: 12 + Math.floor(Math.random() * 10),
    revenueChange: 28 + Math.floor(Math.random() * 15),
    responseTimeChange: -18 - Math.floor(Math.random() * 10),
    requestsTimeline,
    revenueTimeline,
    responseTimeTimeline,
    topAgents: [
      { handle: 'assistant', name: 'AI Assistant', requests: 4520, revenue: 890, rating: 4.9 },
      { handle: 'coder', name: 'Code Helper', requests: 3210, revenue: 654, rating: 4.8 },
      { handle: 'researcher', name: 'Research Bot', requests: 2150, revenue: 432, rating: 4.7 },
    ],
  };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'requests' | 'revenue' | 'response'>('requests');

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData(generateMockData(period));
      setLoading(false);
    }, 500);
  }, [period]);

  const sparklineData = useMemo(() => {
    if (!data) return { requests: [], revenue: [], response: [] };
    return {
      requests: data.requestsTimeline.slice(-12).map((d) => d.value),
      revenue: data.revenueTimeline.slice(-12).map((d) => d.value),
      response: data.responseTimeTimeline.slice(-12).map((d) => d.value),
    };
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
          <h1 className="text-2xl font-bold text-white font-mono mb-1">Analytics</h1>
          <p className="text-zinc-500 text-sm">
            Track performance metrics across all your agents
          </p>
        </div>

        {/* Time filter */}
        <div className="flex gap-2">
          {(['24h', '7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                period === p
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <MetricCard
              title="Total Requests"
              value={data.totalRequests.toLocaleString()}
              change={data.requestsChange}
              icon={Activity}
              iconColor="text-cyan-400"
              sparkline={sparklineData.requests}
            />
            <MetricCard
              title="Revenue"
              value={`$${data.totalRevenue.toLocaleString()}`}
              change={data.revenueChange}
              icon={DollarSign}
              iconColor="text-green-400"
              sparkline={sparklineData.revenue}
            />
            <MetricCard
              title="Avg Response Time"
              value={`${data.avgResponseTime}ms`}
              change={data.responseTimeChange}
              changeLabel="faster is better"
              icon={Clock}
              iconColor="text-yellow-400"
              sparkline={sparklineData.response}
            />
            <MetricCard
              title="Success Rate"
              value={`${data.successRate.toFixed(1)}%`}
              change={0.3}
              icon={Zap}
              iconColor="text-primary"
            />
          </motion.div>

          {/* Chart tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-950 border border-zinc-900 mb-6"
          >
            <div className="flex items-center border-b border-zinc-900">
              <button
                onClick={() => setActiveChart('requests')}
                className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
                  activeChart === 'requests'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Activity className="w-4 h-4 inline-block mr-2" />
                Request Volume
              </button>
              <button
                onClick={() => setActiveChart('revenue')}
                className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
                  activeChart === 'revenue'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <DollarSign className="w-4 h-4 inline-block mr-2" />
                Revenue
              </button>
              <button
                onClick={() => setActiveChart('response')}
                className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
                  activeChart === 'response'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Clock className="w-4 h-4 inline-block mr-2" />
                Response Time
              </button>

              <div className="ml-auto px-4 flex items-center gap-4 text-[10px] text-zinc-600">
                {activeChart === 'requests' && (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary" />
                      Requests
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500/50" />
                      Errors
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-6">
              {activeChart === 'requests' && (
                <BarChart
                  data={data.requestsTimeline}
                  height={240}
                  color="#a855f7"
                  secondaryColor="rgba(239, 68, 68, 0.5)"
                  formatValue={(v) => v.toLocaleString()}
                />
              )}
              {activeChart === 'revenue' && (
                <AreaChart
                  data={data.revenueTimeline}
                  height={240}
                  color="#22c55e"
                  fillColor="rgba(34, 197, 94, 0.1)"
                  formatValue={(v) => `$${v}`}
                />
              )}
              {activeChart === 'response' && (
                <AreaChart
                  data={data.responseTimeTimeline}
                  height={240}
                  color="#eab308"
                  fillColor="rgba(234, 179, 8, 0.1)"
                  formatValue={(v) => `${v}ms`}
                />
              )}
            </div>
          </motion.div>

          {/* Bottom sections */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top performing agents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-zinc-950 border border-zinc-900"
            >
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white font-mono">
                  Top Performing Agents
                </h2>
                <BarChart3 className="w-4 h-4 text-zinc-600" />
              </div>

              {data.topAgents.length === 0 ? (
                <div className="p-6 text-center">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
                  <p className="text-zinc-600 text-sm">
                    Register agents to see performance data
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {data.topAgents.map((agent, i) => (
                    <div key={agent.handle} className="p-4 flex items-center gap-4">
                      <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-sm font-mono text-zinc-500">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-zinc-600 font-mono">
                          @{agent.handle}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">
                          {agent.requests.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-600">requests</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-green-400">
                          ${agent.revenue}
                        </div>
                        <div className="text-[10px] text-zinc-600">revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950 border border-zinc-900"
            >
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white font-mono">
                  Recent Transactions
                </h2>
                <DollarSign className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="p-4">
                <TransactionHistory limit={5} showLoadMore={false} />
              </div>
            </motion.div>
          </div>

          {/* Error summary */}
          {data.totalErrors > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6 bg-red-500/5 border border-red-500/20 p-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-red-400">
                    {data.totalErrors} errors in the last {period}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Check your agent logs for details
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      ) : null}
    </div>
  );
}
