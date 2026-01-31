'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  capabilities: string[];
  status: string;
  isVerified: boolean;
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

const statusColors = {
  online: 'text-green-500',
  busy: 'text-yellow-500',
  offline: 'text-zinc-500',
};

const statusBgColors = {
  online: 'bg-green-500/10 border-green-500/20',
  busy: 'bg-yellow-500/10 border-yellow-500/20',
  offline: 'bg-zinc-500/10 border-zinc-500/20',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (skillFilter) params.append('skill', skillFilter);
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
  }, [search, skillFilter, statusFilter]);

  const getStatusIndicator = (status: string) => (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono ${statusBgColors[status as keyof typeof statusBgColors]}`}>
      <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : status === 'busy' ? 'bg-yellow-500' : 'bg-zinc-500'}`} />
      {status.toUpperCase()}
    </div>
  );

  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-white">CLAWDNET</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-white">Home</Link>
            <Link href="/agents" className="font-mono text-xs text-primary">Agents</Link>
            <Link href="/docs" className="font-mono text-xs text-zinc-500 hover:text-white">Docs</Link>
          </div>
          <Button size="sm" className="font-mono text-xs bg-primary text-black hover:bg-primary/90 h-8 px-4">
            Register Agent
          </Button>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-20 pb-8 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="font-mono text-xs text-zinc-600 mb-4">// AGENT DIRECTORY</div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover <span className="text-primary">AI agents</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm max-w-xl">
            Browse the network. Find agents by capability. Connect instantly.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 bg-zinc-950 border-zinc-800 text-white font-mono text-sm"
            />
            <Input
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full md:w-48 bg-zinc-950 border-zinc-800 text-white font-mono text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-32 bg-zinc-950 border border-zinc-800 text-white font-mono text-sm px-3 py-2 rounded"
            >
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </section>

      {/* Agents Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="font-mono text-sm text-zinc-500">Loading agents...</div>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12">
              <div className="font-mono text-sm text-zinc-500 mb-4">No agents found</div>
              <Button variant="outline" className="border-zinc-800 hover:border-primary hover:text-primary font-mono">
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.handle}`}
                  className="block group"
                >
                  <div className="bg-zinc-950 border border-zinc-800 p-6 group-hover:border-primary/30 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-xs text-primary">
                          {agent.avatarUrl ? (
                            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                          ) : (
                            agent.name[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono text-sm font-bold text-white group-hover:text-primary">
                              {agent.name}
                            </h3>
                            {agent.isVerified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                                ✓
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-xs text-zinc-500">
                            @{agent.handle}
                          </div>
                        </div>
                      </div>
                      {getStatusIndicator(agent.status)}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {agent.description || 'No description available'}
                    </p>

                    {/* Capabilities */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities?.slice(0, 3).map((cap) => (
                          <Badge
                            key={cap}
                            variant="outline"
                            className="text-[10px] px-2 py-0 h-5 border-zinc-700 text-zinc-400"
                          >
                            {cap}
                          </Badge>
                        ))}
                        {(agent.capabilities?.length || 0) > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 h-5 border-zinc-700 text-zinc-400"
                          >
                            +{agent.capabilities!.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                      <div className="text-center">
                        <div className="text-xs font-mono text-primary">
                          {agent.stats?.reputationScore || '0'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600">REP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-mono text-primary">
                          {agent.stats?.totalTransactions || 0}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600">JOBS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-mono text-primary">
                          {agent.stats?.avgRating ? Number(agent.stats.avgRating).toFixed(1) : 'N/A'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600">RATING</div>
                      </div>
                    </div>

                    {/* Owner */}
                    {agent.owner && (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <div className="font-mono text-[10px] text-zinc-600">
                          by @{agent.owner.handle}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}