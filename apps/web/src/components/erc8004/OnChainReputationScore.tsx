'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';

interface OnChainReputationScoreProps {
  handle: string;
  tokenId?: number | null;
  registry?: string | null;
  className?: string;
}

interface ReputationData {
  synced: boolean;
  lastSyncedAt: string | null;
  onChainScore: number | null;
  feedbackCount: number | null;
  clientCount: number | null;
}

export function OnChainReputationScore({
  handle,
  tokenId,
  registry,
  className = '',
}: OnChainReputationScoreProps) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!tokenId || !registry) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/agents/${handle}/on-chain`);
      if (res.ok) {
        const info = await res.json();
        setData(info.reputation);
      } else {
        setError('Failed to fetch reputation');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [handle, tokenId, registry]);

  if (!tokenId || !registry) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-zinc-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-mono text-xs">Loading on-chain reputation...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const scoreColor = data.onChainScore !== null
    ? data.onChainScore >= 80
      ? 'text-green-400'
      : data.onChainScore >= 60
        ? 'text-yellow-400'
        : 'text-orange-400'
    : 'text-zinc-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-sm text-zinc-400">On-Chain Reputation</span>
        </div>
        <button
          onClick={fetchData}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Score */}
        <div className="text-center">
          <div className={`text-2xl font-bold font-mono ${scoreColor}`}>
            {data.onChainScore !== null ? Math.round(data.onChainScore) : '—'}
          </div>
          <div className="text-xs font-mono text-zinc-500">Score</div>
        </div>

        {/* Feedback Count */}
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white">
            {data.feedbackCount ?? '—'}
          </div>
          <div className="text-xs font-mono text-zinc-500">Reviews</div>
        </div>

        {/* Unique Clients */}
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white">
            {data.clientCount ?? '—'}
          </div>
          <div className="text-xs font-mono text-zinc-500">Reviewers</div>
        </div>
      </div>

      {data.lastSyncedAt && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-xs font-mono text-zinc-600">
            Last synced: {new Date(data.lastSyncedAt).toLocaleDateString()}
          </div>
        </div>
      )}

      {!data.synced && data.feedbackCount === null && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-xs font-mono text-yellow-500/80">
            ⚠️ No reviews synced to chain yet
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Compact version for profile cards
export function OnChainScoreBadge({
  score,
  feedbackCount,
  className = '',
}: {
  score: number | null;
  feedbackCount: number | null;
  className?: string;
}) {
  if (score === null) return null;

  const scoreColor = score >= 80
    ? 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400'
    : score >= 60
      ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400'
      : 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r border ${scoreColor} ${className}`}
    >
      <TrendingUp className="w-3 h-3" />
      <span className="font-mono text-sm font-bold">{Math.round(score)}</span>
      {feedbackCount !== null && (
        <span className="font-mono text-xs opacity-70">
          ({feedbackCount} reviews)
        </span>
      )}
    </div>
  );
}
