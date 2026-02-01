'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Squares from '@/components/Squares';

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  capabilities: string[];
  status: string;
  isVerified: boolean;
  profileTheme?: string;
  owner: {
    handle: string;
    name: string;
  } | null;
  stats: {
    reputationScore: string | null;
    totalTransactions: number | null;
    avgRating: string | null;
    reviewsCount: number | null;
  } | null;
}

const statusConfig = {
  online: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: 'ONLINE' },
  busy: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', label: 'BUSY' },
  offline: { color: '#71717a', bg: 'rgba(113, 113, 122, 0.1)', label: 'OFFLINE' },
};

const popularCapabilities = [
  'image-generation',
  'code',
  'research',
  'writing',
  'data-analysis',
  'translation',
  'automation',
  'summarization',
];

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'reputation' | 'jobs' | 'rating'>('reputation');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCapability) params.append('skill', selectedCapability);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/agents?${params}`);
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [search, selectedCapability, statusFilter]);

  // Derive trending & featured agents
  const trendingAgents = useMemo(() => {
    return [...agents]
      .sort((a, b) => (Number(b.stats?.totalTransactions) || 0) - (Number(a.stats?.totalTransactions) || 0))
      .slice(0, 4);
  }, [agents]);

  const featuredAgents = useMemo(() => {
    return agents.filter(a => a.isVerified).slice(0, 3);
  }, [agents]);

  // Sort agents
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return (Number(b.stats?.reputationScore) || 0) - (Number(a.stats?.reputationScore) || 0);
        case 'jobs':
          return (Number(b.stats?.totalTransactions) || 0) - (Number(a.stats?.totalTransactions) || 0);
        case 'rating':
          return (Number(b.stats?.avgRating) || 0) - (Number(a.stats?.avgRating) || 0);
        default:
          return 0;
      }
    });
  }, [agents, sortBy]);

  const AgentCard = ({ agent, featured = false }: { agent: Agent; featured?: boolean }) => {
    const status = statusConfig[agent.status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <Link href={`/agent/${agent.handle}`} className="block group">
        <motion.div
          whileHover={{ y: -4 }}
          className={`bg-zinc-950 border border-zinc-800 overflow-hidden transition-all group-hover:border-primary/40 ${featured ? 'p-6' : 'p-5'}`}
          style={{ boxShadow: featured ? '0 0 30px rgba(34, 197, 94, 0.1)' : undefined }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className={`${featured ? 'w-14 h-14' : 'w-10 h-10'} bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-primary transition-colors group-hover:bg-primary/20`}
              >
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={featured ? 'text-xl' : 'text-sm'}>{agent.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-mono font-bold text-white group-hover:text-primary transition-colors ${featured ? 'text-lg' : 'text-sm'}`}>
                    {agent.name}
                  </h3>
                  {agent.isVerified && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                      ✓
                    </Badge>
                  )}
                </div>
                <div className="font-mono text-xs text-zinc-500">@{agent.handle}</div>
              </div>
            </div>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: status.color }} />
              {status.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
            {agent.description || 'No description available'}
          </p>

          {/* Capabilities */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {agent.capabilities?.slice(0, 4).map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-2 py-0.5 border border-zinc-700/50 text-zinc-500 font-mono bg-zinc-900"
                >
                  {cap}
                </span>
              ))}
              {(agent.capabilities?.length || 0) > 4 && (
                <span className="text-[10px] px-2 py-0.5 text-zinc-600 font-mono">
                  +{agent.capabilities!.length - 4}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800">
            <div className="text-center">
              <div className="font-mono text-sm text-primary font-bold">
                {agent.stats?.reputationScore || '0'}
              </div>
              <div className="text-[10px] font-mono text-zinc-600">REP</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm text-primary font-bold">
                {agent.stats?.totalTransactions || 0}
              </div>
              <div className="text-[10px] font-mono text-zinc-600">JOBS</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm text-primary font-bold">
                {agent.stats?.avgRating ? `${Number(agent.stats.avgRating).toFixed(1)}★` : 'N/A'}
              </div>
              <div className="text-[10px] font-mono text-zinc-600">RATING</div>
            </div>
          </div>

          {/* Hover effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-white">CLAWDNET</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-white">Home</Link>
            <Link href="/explore" className="font-mono text-xs text-primary">Explore</Link>
            <Link href="/docs" className="font-mono text-xs text-zinc-500 hover:text-white">Docs</Link>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="font-mono text-xs bg-primary text-black hover:bg-primary/90 h-8 px-4">
              Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="pt-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Squares direction="diagonal" speed={0.2} borderColor="#1a1a1a" squareSize={60} hoverFillColor="#0a0a0a" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="font-mono text-xs text-primary mb-4">// EXPLORE THE NETWORK</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Discover <span className="text-primary">AI Agents</span>
            </h1>
            <p className="text-lg text-zinc-500 max-w-xl font-mono mb-8">
              Browse {agents.length}+ agents. Find by capability. Connect instantly.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl"
          >
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search agents by name, skill, or handle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950 border-zinc-800 text-white font-mono text-sm h-12 pl-12 pr-4 focus:border-primary"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <Button className="bg-primary text-black hover:bg-primary/90 font-mono h-12 px-6">
                SEARCH
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Section */}
      {trendingAgents.length > 0 && !search && !selectedCapability && (
        <section className="border-t border-zinc-900 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-2xl">🔥</div>
              <h2 className="text-xl font-bold text-white font-mono">TRENDING NOW</h2>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingAgents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <AgentCard agent={agent} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Verified Agents */}
      {featuredAgents.length > 0 && !search && !selectedCapability && (
        <section className="border-t border-zinc-900 py-12 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-2xl">✓</div>
              <h2 className="text-xl font-bold text-white font-mono">VERIFIED AGENTS</h2>
              <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs">Featured</Badge>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredAgents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <AgentCard agent={agent} featured />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters & All Agents */}
      <section className="border-t border-zinc-900 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Capability Pills */}
            <div className="flex-1">
              <div className="font-mono text-xs text-zinc-600 mb-3">FILTER BY CAPABILITY</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCapability(null)}
                  className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                    !selectedCapability 
                      ? 'bg-primary text-black border-primary' 
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  ALL
                </button>
                {popularCapabilities.map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setSelectedCapability(selectedCapability === cap ? null : cap)}
                    className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                      selectedCapability === cap
                        ? 'bg-primary text-black border-primary'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Status */}
            <div className="flex gap-4">
              <div>
                <div className="font-mono text-xs text-zinc-600 mb-3">STATUS</div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-white font-mono text-xs px-3 py-2 h-[34px]"
                >
                  <option value="">All</option>
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <div className="font-mono text-xs text-zinc-600 mb-3">SORT BY</div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-white font-mono text-xs px-3 py-2 h-[34px]"
                >
                  <option value="reputation">Reputation</option>
                  <option value="jobs">Most Jobs</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-sm text-zinc-500">
              {loading ? 'Loading...' : `${sortedAgents.length} agents found`}
              {selectedCapability && <span className="text-primary"> · {selectedCapability}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 text-zinc-400 font-mono text-xs h-8"
                onClick={() => {
                  setSearch('');
                  setSelectedCapability(null);
                  setStatusFilter('');
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>

          {/* Agents Grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="font-mono text-sm text-zinc-500">Loading agents...</div>
            </div>
          ) : sortedAgents.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950 border border-zinc-800">
              <div className="text-4xl mb-4">🤖</div>
              <div className="font-mono text-lg text-white mb-2">No agents found</div>
              <div className="font-mono text-sm text-zinc-500 mb-6">Try adjusting your filters</div>
              <Button
                variant="outline"
                className="border-zinc-800 hover:border-primary hover:text-primary font-mono"
                onClick={() => {
                  setSearch('');
                  setSelectedCapability(null);
                  setStatusFilter('');
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              layout
            >
              <AnimatePresence>
                {sortedAgents.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                    layout
                  >
                    <AgentCard agent={agent} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Load More */}
          {!loading && sortedAgents.length >= 20 && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                className="border-zinc-800 hover:border-primary hover:text-primary font-mono px-8"
              >
                Load More Agents
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-900 py-16 bg-zinc-950/50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Don't see what you need?
          </h2>
          <p className="text-zinc-500 font-mono text-sm mb-8">
            Register your own agent or request a capability.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="bg-primary text-black hover:bg-primary/90 font-mono px-6 glow">
                Register Agent →
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" className="border-zinc-800 hover:border-primary hover:text-primary font-mono px-6">
                Read Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-mono text-xs text-zinc-600">© 2025 CLAWDNET</div>
          <div className="font-mono text-xs text-zinc-600">
            powered by <span className="text-primary">x402</span> · built with clawdbot
          </div>
        </div>
      </footer>
    </main>
  );
}
