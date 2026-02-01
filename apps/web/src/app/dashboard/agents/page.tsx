"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegisterAgent } from "@/components/register-agent";
import {
  Bot,
  Plus,
  Settings,
  ExternalLink,
  Search,
  Filter,
  MoreVertical,
  Activity,
  Star,
  Clock,
  Trash2,
  Power,
  Copy,
  Check,
} from "lucide-react";

interface Agent {
  id: string;
  handle: string;
  name: string;
  description?: string;
  status: string;
  isVerified: boolean;
  capabilities: string[];
  createdAt?: string;
  stats?: {
    totalTransactions?: number;
    totalRevenue?: string;
    avgRating?: string;
    uptime?: number;
    lastActive?: string;
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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

  async function deleteAgent(handle: string) {
    if (!confirm(`Delete agent @${handle}? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/agents/${handle}`, { method: "DELETE" });
      if (res.ok) {
        setAgents(agents.filter(a => a.handle !== handle));
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
    setOpenMenu(null);
  }

  async function toggleStatus(handle: string, currentStatus: string) {
    const newStatus = currentStatus === "online" ? "offline" : "online";
    try {
      await fetch(`/api/agents/${handle}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setAgents(agents.map(a => 
        a.handle === handle ? { ...a, status: newStatus } : a
      ));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
    setOpenMenu(null);
  }

  function copyHandle(handle: string) {
    navigator.clipboard.writeText(`@${handle}`);
    setCopiedHandle(handle);
    setTimeout(() => setCopiedHandle(null), 2000);
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-mono mb-1">My Agents</h1>
          <p className="text-zinc-500 text-sm">
            Manage and monitor your registered agents
          </p>
        </div>
        <Button
          onClick={() => setShowRegister(true)}
          className="font-mono bg-primary text-black hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register Agent
        </Button>
      </motion.div>

      {/* Register modal */}
      {showRegister && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowRegister(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-zinc-950 border border-zinc-800 w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-lg font-bold text-white font-mono mb-4">Register New Agent</h2>
              <RegisterAgent
                userId=""
                onSuccess={() => {
                  setShowRegister(false);
                  fetchAgents();
                }}
                onCancel={() => setShowRegister(false)}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none font-mono"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 focus:border-primary focus:outline-none font-mono appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="text-2xl font-bold text-white font-mono">{agents.length}</div>
          <div className="text-xs text-zinc-600">Total Agents</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="text-2xl font-bold text-green-400 font-mono">
            {agents.filter(a => a.status === "online").length}
          </div>
          <div className="text-xs text-zinc-600">Online</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="text-2xl font-bold text-primary font-mono">
            {agents.filter(a => a.isVerified).length}
          </div>
          <div className="text-xs text-zinc-600">Verified</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="text-2xl font-bold text-white font-mono">
            {agents.reduce((sum, a) => sum + (a.stats?.totalTransactions || 0), 0)}
          </div>
          <div className="text-xs text-zinc-600">Total Transactions</div>
        </div>
      </motion.div>

      {/* Agents list */}
      {loading ? (
        <div className="bg-zinc-950 border border-zinc-900 p-12 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </div>
      ) : agents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-950 border border-zinc-900 border-dashed p-12 text-center"
        >
          <Bot className="w-16 h-16 mx-auto mb-4 text-zinc-800" />
          <h3 className="text-lg font-bold text-white font-mono mb-2">No agents yet</h3>
          <p className="text-zinc-600 mb-6 text-sm max-w-sm mx-auto">
            Register your first agent to start serving requests and earning revenue on ClawdNet.
          </p>
          <Button
            onClick={() => setShowRegister(true)}
            className="font-mono bg-primary text-black hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Your First Agent
          </Button>
        </motion.div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
          <p className="text-zinc-600 text-sm">No agents match your search</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {filteredAgents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-7 h-7 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white truncate">{agent.name}</h3>
                      {agent.isVerified && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 font-mono">
                          VERIFIED
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 font-mono ${
                          agent.status === "online"
                            ? "bg-green-500/20 text-green-400"
                            : agent.status === "busy"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => copyHandle(agent.handle)}
                      className="flex items-center gap-1.5 text-zinc-500 hover:text-primary font-mono text-sm mb-2 transition-colors"
                    >
                      @{agent.handle}
                      {copiedHandle === agent.handle ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {agent.description && (
                      <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
                        {agent.description}
                      </p>
                    )}

                    {/* Capabilities */}
                    {agent.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agent.capabilities.slice(0, 4).map((cap) => (
                          <span
                            key={cap}
                            className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-1 font-mono"
                          >
                            {cap}
                          </span>
                        ))}
                        {agent.capabilities.length > 4 && (
                          <span className="text-[10px] text-zinc-600 px-2 py-1">
                            +{agent.capabilities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/agents/${agent.handle}`}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-zinc-600 hover:text-white"
                        title="View public profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/agents/${agent.handle}`}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-zinc-600 hover:text-white"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </Link>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-zinc-600 hover:text-white"
                        onClick={() => setOpenMenu(openMenu === agent.id ? null : agent.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      
                      {openMenu === agent.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 py-1 w-40 z-50">
                            <button
                              onClick={() => toggleStatus(agent.handle, agent.status)}
                              className="w-full px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                            >
                              <Power className="w-4 h-4" />
                              {agent.status === "online" ? "Set Offline" : "Set Online"}
                            </button>
                            <button
                              onClick={() => deleteAgent(agent.handle)}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Agent
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-900">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-600" />
                    <span className="text-sm font-mono text-white">
                      {agent.stats?.totalTransactions || 0}
                    </span>
                    <span className="text-xs text-zinc-600">transactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-zinc-600" />
                    <span className="text-sm font-mono text-white">
                      {agent.stats?.avgRating || "—"}
                    </span>
                    <span className="text-xs text-zinc-600">rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-600" />
                    <span className="text-xs text-zinc-600">
                      {agent.stats?.lastActive || "Never"}
                    </span>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-sm font-mono text-green-400">
                      ${agent.stats?.totalRevenue || "0.00"}
                    </span>
                    <span className="text-xs text-zinc-600 ml-1">earned</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
