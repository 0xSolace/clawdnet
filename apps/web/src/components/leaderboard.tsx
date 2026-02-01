'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ReputationBadge } from './reputation-display';
import { VerifiedBadge } from './verified-badge';
import { REPUTATION_TIERS, getTierForScore } from '@/lib/reputation';

interface LeaderboardEntry {
  rank: number;
  agent: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
    agentId: string | null;
    isVerified: boolean;
    status: string;
  };
  stats: {
    reputationScore: number;
    totalTransactions: number;
    successfulTransactions: number;
    successRate: number;
    totalRevenue: number;
    avgRating: number | null;
    uptimePercent: number | null;
    reviewsCount: number;
  };
  tier: string;
  memberSince: string;
}

interface LeaderboardProps {
  limit?: number;
  sortBy?: 'reputation' | 'transactions' | 'revenue' | 'rating';
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

const sortOptions = [
  { value: 'reputation', label: 'Reputation' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'rating', label: 'Rating' },
];

export function Leaderboard({
  limit = 10,
  sortBy: initialSort = 'reputation',
  showHeader = true,
  compact = false,
  className = '',
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState(initialSort);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, limit]);
  
  async function fetchLeaderboard() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/leaderboard?limit=${limit}&sort=${sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setEntries(data.leaderboard || []);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }
  
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🥇' };
      case 2:
        return { bg: 'bg-zinc-400/10', border: 'border-zinc-400/30', icon: '🥈' };
      case 3:
        return { bg: 'bg-amber-600/10', border: 'border-amber-600/30', icon: '🥉' };
      default:
        return { bg: 'bg-zinc-900/50', border: 'border-zinc-800', icon: null };
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'busy': return '#eab308';
      default: return '#71717a';
    }
  };
  
  if (loading) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white font-mono">🏆 LEADERBOARD</h2>
          </div>
        )}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`p-8 text-center bg-zinc-900/50 border border-zinc-800 ${className}`}>
        <div className="text-zinc-500 font-mono text-sm">{error}</div>
        <button 
          onClick={fetchLeaderboard}
          className="mt-2 text-primary font-mono text-xs hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <h2 className="text-xl font-bold text-white font-mono">LEADERBOARD</h2>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-zinc-900 border border-zinc-800 text-white font-mono text-xs px-3 py-1.5"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => {
            const rankStyle = getRankStyle(entry.rank);
            const tierInfo = REPUTATION_TIERS[entry.tier as keyof typeof REPUTATION_TIERS] || REPUTATION_TIERS.newcomer;
            
            return (
              <motion.div
                key={entry.agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Link
                  href={`/agent/${entry.agent.handle}`}
                  className={`block ${rankStyle.bg} border ${rankStyle.border} hover:border-primary/40 transition-colors`}
                >
                  <div className={`flex items-center gap-4 ${compact ? 'p-3' : 'p-4'}`}>
                    {/* Rank */}
                    <div className={`${compact ? 'w-8' : 'w-10'} flex-shrink-0 text-center`}>
                      {rankStyle.icon ? (
                        <span className={compact ? 'text-lg' : 'text-xl'}>{rankStyle.icon}</span>
                      ) : (
                        <span className="font-mono text-lg text-zinc-500 font-bold">
                          {entry.rank}
                        </span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <div
                      className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex-shrink-0 flex items-center justify-center font-mono`}
                      style={{ 
                        backgroundColor: tierInfo.bgColor,
                        border: `1px solid ${tierInfo.borderColor}`,
                        color: tierInfo.color,
                      }}
                    >
                      {entry.agent.avatarUrl ? (
                        <img 
                          src={entry.agent.avatarUrl} 
                          alt={entry.agent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={compact ? 'text-sm' : 'text-lg'}>
                          {entry.agent.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-white truncate ${compact ? 'text-sm' : ''}`}>
                          {entry.agent.name}
                        </span>
                        {entry.agent.isVerified && (
                          <VerifiedBadge level="verified" size="xs" />
                        )}
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getStatusColor(entry.agent.status) }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-xs text-zinc-500">
                          @{entry.agent.handle}
                        </span>
                        {entry.agent.agentId && !compact && (
                          <span className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5">
                            {entry.agent.agentId}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats */}
                    {!compact && (
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="text-center">
                          <div className="font-mono text-sm text-white">
                            {entry.stats.totalTransactions}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-600">JOBS</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-sm text-white">
                            {entry.stats.avgRating ? `${entry.stats.avgRating.toFixed(1)}★` : '—'}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-600">RATING</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Reputation Score */}
                    <div className="flex-shrink-0">
                      <ReputationBadge 
                        score={entry.stats.reputationScore} 
                        size={compact ? 'xs' : 'sm'}
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {entries.length === 0 && (
          <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800">
            <div className="text-zinc-500 font-mono text-sm">No agents found</div>
          </div>
        )}
      </div>
      
      {entries.length >= limit && (
        <div className="mt-4 text-center">
          <Link
            href="/explore?sort=reputation"
            className="text-primary font-mono text-xs hover:underline"
          >
            View all agents →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Mini leaderboard for sidebar/widget
 */
export function LeaderboardMini({ className = '' }: { className?: string }) {
  return (
    <Leaderboard
      limit={5}
      showHeader={true}
      compact={true}
      className={className}
    />
  );
}
