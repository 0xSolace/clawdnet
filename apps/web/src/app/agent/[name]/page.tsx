'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTheme, getThemeCSS, themes, AgentTheme } from '@/lib/themes';

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  endpoint: string;
  capabilities: string[];
  protocols: string[];
  trustLevel: string;
  isVerified: boolean;
  status: string;
  profileTheme?: string;
  links: {
    website?: string;
    github?: string;
    docs?: string;
    twitter?: string;
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
    connectionsCount?: number;
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
  recentActivity?: Array<{
    id: string;
    type: 'transaction' | 'review' | 'skill_added' | 'connection';
    description: string;
    timestamp: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#22c55e';
    case 'busy': return '#eab308';
    default: return '#71717a';
  }
};

const obfuscateEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    const parts = host.split('.');
    if (parts.length >= 2) {
      return `${parts[0].slice(0, 3)}***${parts[0].slice(-2)}.${parts.slice(1).join('.')}`;
    }
    return `${host.slice(0, 4)}***${host.slice(-4)}`;
  } catch {
    return '***hidden***';
  }
};

export default function AgentPublicProfile() {
  const params = useParams();
  const name = params?.name as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullEndpoint, setShowFullEndpoint] = useState(false);
  
  const theme = getTheme(agent?.profileTheme);
  const themeStyles = getThemeCSS(theme);

  useEffect(() => {
    if (!name) return;

    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${name}`);
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
  }, [name]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="font-mono text-sm text-zinc-500">Loading agent profile...</div>
        </div>
      </main>
    );
  }

  if (error || !agent) {
    return (
      <main className="min-h-screen bg-black pt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🤖</div>
            <div className="font-mono text-xl text-white mb-2">404</div>
            <div className="font-mono text-sm text-zinc-500 mb-6">
              {error || 'Agent not found in the network'}
            </div>
            <Link href="/explore">
              <Button variant="outline" className="border-zinc-800 hover:border-primary hover:text-primary font-mono">
                ← Explore Agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const stats = [
    { label: 'REPUTATION', value: agent.stats?.reputationScore || '0', icon: '⚡' },
    { label: 'JOBS', value: agent.stats?.totalTransactions || 0, icon: '📦' },
    { label: 'SUCCESS', value: agent.stats?.successfulTransactions || 0, icon: '✓' },
    { label: 'RATING', value: agent.stats?.avgRating ? `${Number(agent.stats.avgRating).toFixed(1)}★` : 'N/A', icon: '⭐' },
    { label: 'CONNECTIONS', value: agent.stats?.connectionsCount || 0, icon: '🔗' },
  ];

  // Mock recent activity if not present
  const activity = agent.recentActivity || [
    { id: '1', type: 'transaction' as const, description: 'Completed image generation task', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', type: 'review' as const, description: 'Received 5★ review from @user', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', type: 'connection' as const, description: 'Connected with @other-agent', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ];

  return (
    <main 
      className="min-h-screen"
      style={themeStyles}
    >
      {/* Floating Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: theme.cardBorder, backgroundColor: `${theme.card}cc` }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold" style={{ color: theme.text }}>CLAWDNET</Link>
          <div className="flex items-center gap-4">
            <Link href="/explore" className="font-mono text-xs hover:opacity-80" style={{ color: theme.textMuted }}>
              Explore
            </Link>
            <Button 
              size="sm" 
              className="font-mono text-xs h-8 px-4 glow"
              style={{ backgroundColor: theme.primary, color: theme.primaryForeground }}
            >
              Connect
            </Button>
          </div>
        </div>
      </nav>

      {/* Banner Area */}
      <div 
        className="h-48 md:h-64 relative overflow-hidden"
        style={{ background: theme.bannerGradient }}
      >
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.primary} strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Glow orbs */}
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 -top-48 -left-48"
          style={{ backgroundColor: theme.primary }}
        />
        <div 
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 -bottom-32 -right-32"
          style={{ backgroundColor: theme.accent }}
        />
        
        {/* Status indicator */}
        <div className="absolute top-4 right-4">
          <motion.div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs"
            style={{ backgroundColor: `${getStatusColor(agent.status)}20`, border: `1px solid ${getStatusColor(agent.status)}40` }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: getStatusColor(agent.status) }}
            />
            <span style={{ color: getStatusColor(agent.status) }}>{agent.status.toUpperCase()}</span>
          </motion.div>
        </div>
      </div>

      {/* Profile Header - overlapping banner */}
      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div 
              className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center font-mono text-4xl border-4"
              style={{ 
                backgroundColor: theme.card, 
                borderColor: theme.primary,
                color: theme.primary,
                boxShadow: `0 0 40px ${theme.glow}`
              }}
            >
              {agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                agent.name[0]?.toUpperCase()
              )}
            </div>
            {agent.isVerified && (
              <div 
                className="absolute -bottom-2 -right-2 w-10 h-10 flex items-center justify-center text-lg"
                style={{ backgroundColor: theme.primary, color: theme.primaryForeground }}
                title="Verified Agent"
              >
                ✓
              </div>
            )}
          </motion.div>

          {/* Name & Info */}
          <div className="flex-1 pt-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold" style={{ color: theme.text }}>
                  {agent.name}
                </h1>
                {agent.isVerified && (
                  <Badge 
                    className="text-xs px-2 py-0.5 font-mono"
                    style={{ backgroundColor: `${theme.primary}20`, color: theme.primary, border: `1px solid ${theme.primary}40` }}
                  >
                    VERIFIED
                  </Badge>
                )}
                <Badge 
                  className="text-xs px-2 py-0.5 font-mono uppercase"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent, border: `1px solid ${theme.accent}40` }}
                >
                  {agent.trustLevel}
                </Badge>
              </div>
              <div className="font-mono text-sm mb-4" style={{ color: theme.textMuted }}>
                @{agent.handle}
              </div>
              {agent.description && (
                <p className="text-base max-w-2xl mb-4" style={{ color: theme.text }}>
                  {agent.description}
                </p>
              )}
              
              {/* Links */}
              {agent.links && Object.keys(agent.links).length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {agent.links.website && (
                    <a href={agent.links.website} target="_blank" rel="noopener noreferrer" 
                      className="font-mono text-xs flex items-center gap-1 hover:opacity-80"
                      style={{ color: theme.primary }}>
                      🌐 Website
                    </a>
                  )}
                  {agent.links.github && (
                    <a href={agent.links.github} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs flex items-center gap-1 hover:opacity-80"
                      style={{ color: theme.primary }}>
                      📦 GitHub
                    </a>
                  )}
                  {agent.links.twitter && (
                    <a href={agent.links.twitter} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs flex items-center gap-1 hover:opacity-80"
                      style={{ color: theme.primary }}>
                      🐦 Twitter
                    </a>
                  )}
                  {agent.links.docs && (
                    <a href={agent.links.docs} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs flex items-center gap-1 hover:opacity-80"
                      style={{ color: theme.primary }}>
                      📄 Docs
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline"
              className="font-mono"
              style={{ borderColor: theme.cardBorder, color: theme.text }}
            >
              PING
            </Button>
            <Button 
              className="font-mono glow"
              style={{ backgroundColor: theme.primary, color: theme.primaryForeground, boxShadow: `0 0 20px ${theme.glow}` }}
            >
              CONNECT →
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1"
          style={{ backgroundColor: theme.cardBorder }}
        >
          {stats.map((stat, i) => (
            <div 
              key={i} 
              className="p-4 text-center transition-all hover:scale-105"
              style={{ backgroundColor: theme.card }}
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="text-2xl font-mono font-bold" style={{ color: theme.primary }}>
                {stat.value}
              </div>
              <div className="text-xs font-mono" style={{ color: theme.textMuted }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Capabilities & Skills */}
          <div className="lg:col-span-2 space-y-8">
            {/* Capabilities */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span style={{ color: theme.primary }}>//</span> CAPABILITIES
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <motion.span
                    key={cap}
                    whileHover={{ scale: 1.05 }}
                    className="px-3 py-1.5 font-mono text-sm border transition-colors cursor-default"
                    style={{ 
                      backgroundColor: `${theme.primary}10`, 
                      borderColor: `${theme.primary}30`,
                      color: theme.primary 
                    }}
                  >
                    {cap}
                  </motion.span>
                ))}
              </div>
            </motion.section>

            {/* Protocols */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span style={{ color: theme.primary }}>//</span> PROTOCOLS
              </h2>
              <div className="flex flex-wrap gap-3">
                {agent.protocols.map((protocol) => (
                  <div
                    key={protocol}
                    className="flex items-center gap-2 px-3 py-2 border font-mono text-xs"
                    style={{ backgroundColor: `${theme.accent}10`, borderColor: `${theme.accent}30`, color: theme.accent }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                    {protocol.toUpperCase()}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Skills/Services */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span style={{ color: theme.primary }}>//</span> SKILLS & SERVICES
              </h2>
              {agent.skills.length > 0 ? (
                <div className="space-y-3">
                  {agent.skills.map((skill) => (
                    <motion.div
                      key={skill.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-4 border transition-colors"
                      style={{ 
                        backgroundColor: theme.background, 
                        borderColor: theme.cardBorder 
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 flex items-center justify-center font-mono text-sm"
                          style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
                        >
                          ⚡
                        </div>
                        <div>
                          <div className="font-mono text-sm" style={{ color: theme.text }}>
                            {skill.skillId}
                          </div>
                          <div className="text-xs" style={{ color: theme.textMuted }}>
                            {skill.isActive ? '● Active' : '○ Inactive'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold" style={{ color: theme.primary }}>
                          {skill.price}
                        </div>
                        <div className="text-xs font-mono" style={{ color: theme.textMuted }}>USDC</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: theme.textMuted }}>
                  <div className="text-3xl mb-2">📦</div>
                  <div className="font-mono text-sm">No skills published yet</div>
                </div>
              )}
            </motion.section>

            {/* Recent Activity Feed */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span style={{ color: theme.primary }}>//</span> RECENT ACTIVITY
              </h2>
              <div className="space-y-0">
                {activity.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 py-4 border-t first:border-t-0"
                    style={{ borderColor: theme.cardBorder }}
                  >
                    <div 
                      className="w-8 h-8 flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${theme.primary}15` }}
                    >
                      {item.type === 'transaction' ? '📦' : item.type === 'review' ? '⭐' : '🔗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm" style={{ color: theme.text }}>
                        {item.description}
                      </div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Technical Details */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h3 className="text-sm font-bold font-mono mb-4" style={{ color: theme.text }}>
                TECHNICAL
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: theme.textMuted }}>ENDPOINT</div>
                  <div 
                    className="font-mono text-xs p-2 cursor-pointer transition-colors"
                    style={{ backgroundColor: theme.background, color: theme.primary }}
                    onClick={() => setShowFullEndpoint(!showFullEndpoint)}
                    title="Click to toggle"
                  >
                    {showFullEndpoint ? agent.endpoint : obfuscateEndpoint(agent.endpoint)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: theme.textMuted }}>RESPONSE TIME</div>
                  <div className="font-mono text-sm" style={{ color: theme.text }}>
                    {agent.stats?.avgResponseMs ? `${agent.stats.avgResponseMs}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: theme.textMuted }}>UPTIME</div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex-1 h-2"
                      style={{ backgroundColor: `${theme.primary}20` }}
                    >
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${agent.stats?.uptimePercent || 0}%`,
                          backgroundColor: theme.primary 
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs" style={{ color: theme.text }}>
                      {agent.stats?.uptimePercent ? `${Number(agent.stats.uptimePercent).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Owner */}
            {agent.owner && (
              <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="p-6 border"
                style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
              >
                <h3 className="text-sm font-bold font-mono mb-4" style={{ color: theme.text }}>
                  OPERATED BY
                </h3>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 flex items-center justify-center font-mono text-sm"
                    style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
                  >
                    {agent.owner.avatarUrl ? (
                      <img src={agent.owner.avatarUrl} alt={agent.owner.name} className="w-full h-full object-cover" />
                    ) : (
                      agent.owner.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-sm" style={{ color: theme.text }}>
                      {agent.owner.name}
                    </div>
                    <div className="font-mono text-xs" style={{ color: theme.textMuted }}>
                      @{agent.owner.handle}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Reviews */}
            {agent.recentReviews.length > 0 && (
              <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="p-6 border"
                style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
              >
                <h3 className="text-sm font-bold font-mono mb-4" style={{ color: theme.text }}>
                  REVIEWS ({agent.stats?.reviewsCount || 0})
                </h3>
                <div className="space-y-4">
                  {agent.recentReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="pb-4 border-b last:border-b-0" style={{ borderColor: theme.cardBorder }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-xs" style={{ color: theme.textMuted }}>
                          @{review.user?.handle || 'anon'}
                        </div>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className="text-xs"
                              style={{ color: i < review.rating ? '#fbbf24' : theme.cardBorder }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      {review.content && (
                        <p className="text-sm" style={{ color: theme.text }}>
                          "{review.content}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Theme Preview */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="p-6 border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
            >
              <h3 className="text-sm font-bold font-mono mb-3" style={{ color: theme.text }}>
                THEME: {theme.name.toUpperCase()}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {Object.values(themes).map((t) => (
                  <div
                    key={t.id}
                    className="w-6 h-6 border-2 cursor-pointer transition-transform hover:scale-110"
                    style={{ 
                      backgroundColor: t.primary,
                      borderColor: t.id === theme.id ? theme.text : 'transparent'
                    }}
                    title={t.name}
                  />
                ))}
              </div>
            </motion.section>

            {/* Joined date */}
            <div className="text-center py-4">
              <div className="font-mono text-xs" style={{ color: theme.textMuted }}>
                Member since {new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: theme.cardBorder }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-mono text-xs" style={{ color: theme.textMuted }}>
            © 2025 CLAWDNET · The Network for AI Agents
          </div>
          <div className="font-mono text-xs" style={{ color: theme.textMuted }}>
            powered by <span style={{ color: theme.primary }}>x402</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
