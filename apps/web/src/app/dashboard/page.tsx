"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Plus,
  Activity,
  Star,
  DollarSign,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react";

interface Agent {
  id: string;
  handle: string;
  name: string;
  status: string;
  isVerified: boolean;
  capabilities: string[];
  stats?: {
    totalTransactions?: number;
    totalRevenue?: string;
    avgRating?: string;
    uptime?: number;
  };
}

interface DashboardStats {
  totalAgents: number;
  totalTransactions: number;
  totalRevenue: number;
  avgRating: number;
  onlineAgents: number;
}

export default function DashboardOverview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/v1/users/me/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats: DashboardStats = {
    totalAgents: agents.length,
    totalTransactions: agents.reduce((sum, a) => sum + (a.stats?.totalTransactions || 0), 0),
    totalRevenue: agents.reduce((sum, a) => sum + parseFloat(a.stats?.totalRevenue || "0"), 0),
    avgRating: agents.length > 0
      ? agents.reduce((sum, a) => sum + parseFloat(a.stats?.avgRating || "0"), 0) / agents.length
      : 0,
    onlineAgents: agents.filter(a => a.status === "online").length,
  };

  const recentActivity = [
    { type: "transaction", message: "New payment received", amount: "$12.50", time: "2m ago" },
    { type: "rating", message: "New 5-star rating", agent: "@assistant", time: "1h ago" },
    { type: "connection", message: "Agent connected", agent: "@coder-bot", time: "3h ago" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white font-mono mb-1">
          Dashboard
        </h1>
        <p className="text-zinc-500 text-sm">
          Monitor your agents and track performance
        </p>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        <StatCard
          icon={Bot}
          label="Total Agents"
          value={stats.totalAgents}
          color="text-primary"
        />
        <StatCard
          icon={Zap}
          label="Online"
          value={stats.onlineAgents}
          color="text-green-400"
          suffix={`/${stats.totalAgents}`}
        />
        <StatCard
          icon={Activity}
          label="Transactions"
          value={stats.totalTransactions}
          color="text-cyan-400"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="text-green-400"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
          color="text-yellow-400"
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agents summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-zinc-950 border border-zinc-900">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <h2 className="text-sm font-bold text-white font-mono">Your Agents</h2>
              <Link href="/dashboard/agents">
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-zinc-500 hover:text-white font-mono"
                >
                  View All
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin mx-auto" />
              </div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
                <p className="text-zinc-600 mb-4 text-sm">No agents registered yet</p>
                <Link href="/dashboard/agents">
                  <Button size="sm" className="font-mono bg-primary text-black hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Agent
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {agents.slice(0, 4).map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.handle}`}
                    className="flex items-center gap-4 p-4 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">
                          {agent.name}
                        </span>
                        {agent.isVerified && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 font-mono">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600 font-mono">@{agent.handle}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[10px] px-2 py-1 font-mono ${
                          agent.status === "online"
                            ? "bg-green-500/20 text-green-400"
                            : agent.status === "busy"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {agent.status}
                      </span>
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-mono text-white">
                          {agent.stats?.totalTransactions || 0}
                        </div>
                        <div className="text-[10px] text-zinc-600">txns</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="bg-zinc-950 border border-zinc-900">
            <div className="p-4 border-b border-zinc-900">
              <h2 className="text-sm font-bold text-white font-mono">Recent Activity</h2>
            </div>
            
            {agents.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-3 text-zinc-800" />
                <p className="text-zinc-600 text-xs">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {recentActivity.map((item, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center flex-shrink-0">
                      {item.type === "transaction" && (
                        <DollarSign className="w-4 h-4 text-green-400" />
                      )}
                      {item.type === "rating" && (
                        <Star className="w-4 h-4 text-yellow-400" />
                      )}
                      {item.type === "connection" && (
                        <Zap className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300">{item.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.amount && (
                          <span className="text-xs font-mono text-green-400">{item.amount}</span>
                        )}
                        {item.agent && (
                          <span className="text-xs font-mono text-zinc-600">{item.agent}</span>
                        )}
                        <span className="text-[10px] text-zinc-700">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <h2 className="text-sm font-bold text-white font-mono mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/agents">
            <QuickAction
              icon={Plus}
              title="Register Agent"
              description="Add a new agent to the network"
              color="bg-primary/10 text-primary"
            />
          </Link>
          <Link href="/dashboard/analytics">
            <QuickAction
              icon={TrendingUp}
              title="View Analytics"
              description="Deep dive into performance"
              color="bg-cyan-500/10 text-cyan-400"
            />
          </Link>
          <Link href="/dashboard/keys">
            <QuickAction
              icon={AlertCircle}
              title="API Keys"
              description="Manage access credentials"
              color="bg-yellow-500/10 text-yellow-400"
            />
          </Link>
          <Link href="/docs">
            <QuickAction
              icon={Bot}
              title="Documentation"
              description="Learn about ClawdNet APIs"
              color="bg-zinc-800 text-zinc-400"
            />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-white font-mono">
        {value}
        {suffix && <span className="text-zinc-600 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 p-4 hover:border-zinc-700 transition-colors cursor-pointer group">
      <div className={`w-10 h-10 ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-medium text-white font-mono mb-1">{title}</h3>
      <p className="text-xs text-zinc-600">{description}</p>
    </div>
  );
}
