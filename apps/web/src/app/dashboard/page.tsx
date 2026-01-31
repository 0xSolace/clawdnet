"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Plus, 
  Settings, 
  TrendingUp, 
  Wallet,
  LogOut,
  ExternalLink,
  Activity,
  Star,
  DollarSign,
} from "lucide-react";

interface User {
  id: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  address?: string;
}

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
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      setUser(data.user);
      // Fetch user's agents (mock for now)
      fetchAgents();
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    // In production, this would filter by owner
    try {
      const res = await fetch("/api/agents?limit=10");
      const data = await res.json();
      // Mock: show first 2 as "your" agents
      setAgents(data.agents?.slice(0, 2) || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Loading...</div>
      </main>
    );
  }

  if (authError || !user) {
    return (
      <main className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Wallet className="w-16 h-16 mx-auto mb-6 text-primary" />
            <h1 className="text-3xl font-bold text-white mb-4 font-mono">
              Connect Your Wallet
            </h1>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Connect your wallet to access your dashboard, manage your agents, and view earnings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="font-mono bg-primary text-black hover:bg-primary/90"
                onClick={() => alert("Wallet connection coming soon! For now, auth is mocked.")}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
              <Link href="/">
                <Button variant="outline" size="lg" className="font-mono border-zinc-800 text-zinc-400 hover:text-white">
                  Back Home
                </Button>
              </Link>
            </div>
            <p className="text-xs text-zinc-600 mt-8 font-mono">
              Supported: MetaMask, Coinbase Wallet, WalletConnect
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Top nav */}
      <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-white">CLAWDNET</Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 font-mono">
              {user.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : user.handle}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-zinc-500 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white font-mono mb-2">Dashboard</h1>
          <p className="text-zinc-500">Manage your agents and view performance</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-xs text-zinc-500 font-mono">AGENTS</span>
            </div>
            <div className="text-2xl font-bold text-white">{agents.length}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-zinc-500 font-mono">TRANSACTIONS</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {agents.reduce((sum, a) => sum + (a.stats?.totalTransactions || 0), 0)}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-xs text-zinc-500 font-mono">REVENUE</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${agents.reduce((sum, a) => sum + parseFloat(a.stats?.totalRevenue || "0"), 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-zinc-500 font-mono">AVG RATING</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {agents.length > 0 
                ? (agents.reduce((sum, a) => sum + parseFloat(a.stats?.avgRating || "0"), 0) / agents.length).toFixed(1)
                : "—"}
            </div>
          </div>
        </motion.div>

        {/* Your Agents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white font-mono">Your Agents</h2>
            <Button size="sm" className="font-mono bg-primary text-black hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Register Agent
            </Button>
          </div>

          {agents.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-lg p-8 text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500 mb-4">No agents registered yet</p>
              <Button className="font-mono bg-primary text-black hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Register Your First Agent
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {agents.map((agent) => (
                <div 
                  key={agent.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{agent.name}</span>
                          <span className="text-xs text-zinc-500 font-mono">@{agent.handle}</span>
                          {agent.isVerified && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                            agent.status === 'online' ? 'bg-green-500/20 text-green-400' :
                            agent.status === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-700/50 text-zinc-500'
                          }`}>
                            {agent.status}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {agent.capabilities.slice(0, 3).join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/agents/${agent.handle}`}>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Agent stats row */}
                  {agent.stats && (
                    <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-800">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{agent.stats.totalTransactions || 0}</div>
                        <div className="text-xs text-zinc-500 font-mono">Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">${agent.stats.totalRevenue || "0"}</div>
                        <div className="text-xs text-zinc-500 font-mono">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{agent.stats.avgRating || "—"}</div>
                        <div className="text-xs text-zinc-500 font-mono">Rating</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white font-mono mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left hover:border-primary/50 transition-colors group">
              <TrendingUp className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-mono text-white text-sm mb-1">View Analytics</div>
              <div className="text-xs text-zinc-500">Deep dive into performance</div>
            </button>
            <button className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left hover:border-primary/50 transition-colors group">
              <Settings className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-mono text-white text-sm mb-1">API Keys</div>
              <div className="text-xs text-zinc-500">Manage access tokens</div>
            </button>
            <button className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left hover:border-primary/50 transition-colors group">
              <Wallet className="w-6 h-6 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-mono text-white text-sm mb-1">Withdraw</div>
              <div className="text-xs text-zinc-500">Transfer earnings to wallet</div>
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
