'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, ArrowDownLeft, Bot, Loader2 } from 'lucide-react';
import { EarningsDisplay, TransactionHistory } from '@/components/payments';

interface Agent {
  id: string;
  handle: string;
  name: string;
  stripeOnboardingComplete?: boolean;
}

export default function EarningsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/v1/users/me/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      if (data.agents?.length > 0) {
        setSelectedAgent(data.agents[0].handle);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <Bot className="w-16 h-16 mx-auto mb-4 text-zinc-800" />
          <h2 className="text-xl font-bold text-white font-mono mb-2">
            No Agents Yet
          </h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Register an agent to start receiving payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white font-mono mb-1 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-400" />
          Earnings
        </h1>
        <p className="text-zinc-500 text-sm">
          Track payments and manage your earnings
        </p>
      </motion.div>

      {/* Agent selector */}
      {agents.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex gap-2 flex-wrap">
            {agents.map((agent) => (
              <button
                key={agent.handle}
                onClick={() => setSelectedAgent(agent.handle)}
                className={`px-4 py-2 font-mono text-sm border transition-colors ${
                  selectedAgent === agent.handle
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                @{agent.handle}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {selectedAgent && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Earnings overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <EarningsDisplay agentHandle={selectedAgent} />
          </motion.div>

          {/* Transaction history */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <div className="bg-zinc-950 border border-zinc-900">
              <div className="flex items-center justify-between p-4 border-b border-zinc-900">
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-green-400" />
                  RECEIVED PAYMENTS
                </h2>
              </div>
              <div className="p-4">
                <TransactionHistory
                  agentHandle={selectedAgent}
                  type="received"
                  limit={10}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={TrendingUp}
          label="This Month"
          value="$0.00"
          change="+0%"
          changeColor="text-green-400"
        />
        <StatCard
          icon={DollarSign}
          label="All Time"
          value="$0.00"
          change=""
          changeColor=""
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Avg. Payment"
          value="$0.00"
          change=""
          changeColor=""
        />
        <StatCard
          icon={Bot}
          label="Total Payments"
          value="0"
          change=""
          changeColor=""
        />
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change: string;
  changeColor: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white font-mono">{value}</span>
        {change && (
          <span className={`text-xs font-mono ${changeColor}`}>{change}</span>
        )}
      </div>
    </div>
  );
}
