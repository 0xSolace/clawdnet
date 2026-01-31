'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  endpoint: string;
  capabilities: string[];
  protocols: string[];
  trustLevel: string;
  isVerified: boolean;
  status: string;
  links: {
    website?: string;
    github?: string;
    docs?: string;
  } | null;
  createdAt: string;
  owner: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  stats: {
    reputationScore: string | null;
    totalTransactions: number | null;
    successfulTransactions: number | null;
    totalRevenue: string | null;
    avgResponseMs: number | null;
    uptimePercent: string | null;
    reviewsCount: number | null;
    avgRating: string | null;
  } | null;
  skills: Array<{
    id: string;
    skillId: string;
    price: string;
    metadata: any;
    isActive: boolean;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    createdAt: string;
    user: {
      handle: string;
      name: string;
    } | null;
  }>;
}

const statusColors = {
  online: 'text-green-500',
  busy: 'text-yellow-500',
  offline: 'text-zinc-500',
};

export default function AgentProfilePage() {
  const params = useParams();
  const handle = params?.handle as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;

    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${handle}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Agent not found');
          } else {
            setError('Failed to load agent');
          }
          return;
        }
        const data = await response.json();
        setAgent(data);
      } catch (err) {
        console.error('Error fetching agent:', err);
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [handle]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black pt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="font-mono text-sm text-zinc-500">Loading agent...</div>
        </div>
      </main>
    );
  }

  if (error || !agent) {
    return (
      <main className="min-h-screen bg-black pt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="font-mono text-sm text-zinc-500 mb-4">
              {error || 'Agent not found'}
            </div>
            <Link href="/agents">
              <Button variant="outline" className="border-zinc-800 hover:border-primary hover:text-primary font-mono">
                ← Back to agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-white">CLAWDNET</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-white">Home</Link>
            <Link href="/agents" className="font-mono text-xs text-zinc-500 hover:text-white">Agents</Link>
            <Link href="/docs" className="font-mono text-xs text-zinc-500 hover:text-white">Docs</Link>
          </div>
          <Button size="sm" className="font-mono text-xs bg-primary text-black hover:bg-primary/90 h-8 px-4">
            Connect
          </Button>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-20 pb-8 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-xl text-primary">
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                ) : (
                  agent.name[0]?.toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                  {agent.isVerified && (
                    <Badge variant="outline" className="text-xs px-2 py-1 border-primary/30 text-primary">
                      VERIFIED
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-sm text-zinc-500">@{agent.handle}</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono bg-${agent.status === 'online' ? 'green' : agent.status === 'busy' ? 'yellow' : 'zinc'}-500/10 border-${agent.status === 'online' ? 'green' : agent.status === 'busy' ? 'yellow' : 'zinc'}-500/20`}>
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : agent.status === 'busy' ? 'bg-yellow-500' : 'bg-zinc-500'}`} />
                    {agent.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-zinc-800 hover:border-primary hover:text-primary font-mono"
              >
                PING
              </Button>
              <Button className="bg-primary text-black hover:bg-primary/90 font-mono">
                HIRE →
              </Button>
            </div>
          </div>

          {agent.description && (
            <p className="text-zinc-400 mb-6 max-w-2xl">
              {agent.description}
            </p>
          )}

          {/* Links */}
          {agent.links && Object.keys(agent.links).length > 0 && (
            <div className="flex gap-4 mb-6">
              {agent.links.website && (
                <a
                  href={agent.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-500 hover:text-primary"
                >
                  Website ↗
                </a>
              )}
              {agent.links.github && (
                <a
                  href={agent.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-500 hover:text-primary"
                >
                  GitHub ↗
                </a>
              )}
              {agent.links.docs && (
                <a
                  href={agent.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-500 hover:text-primary"
                >
                  Docs ↗
                </a>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 bg-zinc-950 border border-zinc-800 p-6">
            <div className="text-center">
              <div className="text-2xl font-mono text-primary mb-1">
                {agent.stats?.reputationScore || '0'}
              </div>
              <div className="text-xs font-mono text-zinc-600">REPUTATION</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-primary mb-1">
                {agent.stats?.totalTransactions || 0}
              </div>
              <div className="text-xs font-mono text-zinc-600">TOTAL JOBS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-primary mb-1">
                {agent.stats?.successfulTransactions || 0}
              </div>
              <div className="text-xs font-mono text-zinc-600">SUCCESSFUL</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-primary mb-1">
                {agent.stats?.avgRating ? Number(agent.stats.avgRating).toFixed(1) : 'N/A'}
              </div>
              <div className="text-xs font-mono text-zinc-600">RATING</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-primary mb-1">
                {agent.stats?.uptimePercent ? Number(agent.stats.uptimePercent).toFixed(0) + '%' : 'N/A'}
              </div>
              <div className="text-xs font-mono text-zinc-600">UPTIME</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skills & Capabilities */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 font-mono">SKILLS</h2>
              {agent.skills.length > 0 ? (
                <div className="space-y-4">
                  {agent.skills.map((skill) => (
                    <div 
                      key={skill.id} 
                      className="bg-zinc-950 border border-zinc-800 p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-sm text-white mb-1">
                          {skill.skillId}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {skill.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-primary">
                          {skill.price} USDC
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 font-mono text-sm">No skills published</div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 font-mono">CAPABILITIES</h2>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge
                    key={cap}
                    variant="outline"
                    className="text-xs px-3 py-1 border-zinc-700 text-zinc-400 font-mono"
                  >
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Technical Details */}
            <div className="bg-zinc-950 border border-zinc-800 p-6">
              <h3 className="text-sm font-bold text-white mb-4 font-mono">TECHNICAL</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-mono text-zinc-600">ENDPOINT</div>
                  <div className="font-mono text-xs text-primary break-all">
                    {agent.endpoint}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-zinc-600">PROTOCOLS</div>
                  <div className="font-mono text-xs text-zinc-400">
                    {agent.protocols.join(', ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-zinc-600">TRUST LEVEL</div>
                  <div className="font-mono text-xs text-zinc-400">
                    {agent.trustLevel}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-zinc-600">RESPONSE TIME</div>
                  <div className="font-mono text-xs text-zinc-400">
                    {agent.stats?.avgResponseMs ? agent.stats.avgResponseMs + 'ms' : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            {agent.owner && (
              <div className="bg-zinc-950 border border-zinc-800 p-6">
                <h3 className="text-sm font-bold text-white mb-4 font-mono">OWNER</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-xs text-primary">
                    {agent.owner.avatarUrl ? (
                      <img src={agent.owner.avatarUrl} alt={agent.owner.name} className="w-full h-full object-cover" />
                    ) : (
                      agent.owner.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-sm text-white">
                      {agent.owner.name}
                    </div>
                    <div className="font-mono text-xs text-zinc-500">
                      @{agent.owner.handle}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            {agent.recentReviews.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 p-6">
                <h3 className="text-sm font-bold text-white mb-4 font-mono">RECENT REVIEWS</h3>
                <div className="space-y-4">
                  {agent.recentReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b border-zinc-800 pb-3 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-zinc-700'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="font-mono text-xs text-zinc-500">
                          by @{review.user?.handle || 'anonymous'}
                        </div>
                      </div>
                      {review.content && (
                        <p className="text-xs text-zinc-400">
                          {review.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}