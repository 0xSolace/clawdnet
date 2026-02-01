'use client';

import { motion } from 'framer-motion';
import { 
  REPUTATION_TIERS, 
  getTierForScore, 
  getProgressToNextTier,
  formatScore,
  type ReputationTier,
} from '@/lib/reputation';

interface ReputationDisplayProps {
  score: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTier?: boolean;
  showProgress?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: { score: 'text-sm', tier: 'text-[8px]', icon: 'text-xs', progress: 'h-0.5' },
  sm: { score: 'text-lg', tier: 'text-[10px]', icon: 'text-sm', progress: 'h-1' },
  md: { score: 'text-2xl', tier: 'text-xs', icon: 'text-base', progress: 'h-1.5' },
  lg: { score: 'text-4xl', tier: 'text-sm', icon: 'text-xl', progress: 'h-2' },
};

export function ReputationDisplay({
  score,
  size = 'md',
  showTier = true,
  showProgress = false,
  showIcon = true,
  animated = true,
  className = '',
}: ReputationDisplayProps) {
  const tier = getTierForScore(score);
  const tierInfo = REPUTATION_TIERS[tier];
  const sizeClass = sizeConfig[size];
  const { progress, nextTier } = getProgressToNextTier(score);
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        {showIcon && (
          <motion.span
            className={sizeClass.icon}
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {tierInfo.icon}
          </motion.span>
        )}
        
        <div>
          <motion.div
            className={`font-mono font-bold ${sizeClass.score}`}
            style={{ color: tierInfo.color }}
            initial={animated ? { opacity: 0, y: 10 } : undefined}
            animate={animated ? { opacity: 1, y: 0 } : undefined}
          >
            {formatScore(score)}
          </motion.div>
          
          {showTier && (
            <div
              className={`font-mono ${sizeClass.tier} uppercase tracking-wide`}
              style={{ color: tierInfo.color }}
            >
              {tierInfo.name}
            </div>
          )}
        </div>
      </div>
      
      {showProgress && nextTier && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className={`font-mono ${sizeClass.tier} text-zinc-500`}>
              Progress to {REPUTATION_TIERS[nextTier].name}
            </span>
            <span className={`font-mono ${sizeClass.tier} text-zinc-400`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className={`w-full ${sizeClass.progress} rounded-full overflow-hidden`}
            style={{ backgroundColor: tierInfo.bgColor }}
          >
            <motion.div
              className={sizeClass.progress}
              style={{ backgroundColor: tierInfo.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact reputation badge
 */
export function ReputationBadge({
  score,
  size = 'sm',
  className = '',
}: {
  score: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const tier = getTierForScore(score);
  const tierInfo = REPUTATION_TIERS[tier];
  
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };
  
  return (
    <motion.div
      className={`inline-flex items-center gap-1 font-mono font-bold ${sizeStyles[size]} ${className}`}
      style={{
        backgroundColor: tierInfo.bgColor,
        color: tierInfo.color,
        border: `1px solid ${tierInfo.borderColor}`,
      }}
      whileHover={{ scale: 1.05 }}
      title={`${tierInfo.name}: ${tierInfo.description}`}
    >
      <span>{tierInfo.icon}</span>
      <span>{formatScore(score)}</span>
    </motion.div>
  );
}

/**
 * Full reputation card with breakdown
 */
export function ReputationCard({
  score,
  breakdown,
  className = '',
}: {
  score: number;
  breakdown?: {
    transactions: number;
    successRate: number;
    reviews: number;
    uptime: number;
    age: number;
    connections: number;
  };
  className?: string;
}) {
  const tier = getTierForScore(score);
  const tierInfo = REPUTATION_TIERS[tier];
  const { progress, nextTier } = getProgressToNextTier(score);
  
  const breakdownItems = breakdown ? [
    { label: 'Transactions', value: breakdown.transactions, icon: '📦' },
    { label: 'Success Rate', value: breakdown.successRate, icon: '✓' },
    { label: 'Reviews', value: breakdown.reviews, icon: '⭐' },
    { label: 'Uptime', value: breakdown.uptime, icon: '🔌' },
    { label: 'Age', value: breakdown.age, icon: '📅' },
    { label: 'Connections', value: breakdown.connections, icon: '🔗' },
  ] : [];
  
  return (
    <motion.div
      className={`p-6 border ${className}`}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderColor: tierInfo.borderColor,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 flex items-center justify-center text-2xl"
            style={{ backgroundColor: tierInfo.bgColor }}
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            {tierInfo.icon}
          </motion.div>
          <div>
            <div className="font-mono text-3xl font-bold" style={{ color: tierInfo.color }}>
              {formatScore(score)}
            </div>
            <div className="font-mono text-xs uppercase" style={{ color: tierInfo.color }}>
              {tierInfo.name}
            </div>
          </div>
        </div>
        
        <div
          className="px-3 py-1 text-xs font-mono"
          style={{ backgroundColor: tierInfo.bgColor, color: tierInfo.color }}
        >
          REP SCORE
        </div>
      </div>
      
      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-zinc-500">
              Progress to {REPUTATION_TIERS[nextTier].name}
            </span>
            <span className="font-mono text-xs" style={{ color: REPUTATION_TIERS[nextTier].color }}>
              {REPUTATION_TIERS[nextTier].minScore - score} points needed
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ 
                background: `linear-gradient(90deg, ${tierInfo.color}, ${REPUTATION_TIERS[nextTier].color})` 
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
      
      {/* Breakdown */}
      {breakdown && (
        <div className="grid grid-cols-3 gap-3">
          {breakdownItems.map((item) => (
            <div
              key={item.label}
              className="p-3 bg-zinc-900/50 border border-zinc-800"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{item.icon}</span>
                <span className="font-mono text-[10px] text-zinc-500 uppercase">
                  {item.label}
                </span>
              </div>
              <div className="font-mono text-sm text-white">
                {Math.round(item.value)}
              </div>
              <div className="w-full h-1 bg-zinc-800 mt-1">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${item.value}%`,
                    backgroundColor: item.value >= 80 ? '#22c55e' : item.value >= 50 ? '#eab308' : '#ef4444',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Tier description */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="font-mono text-xs text-zinc-500">
          {tierInfo.description}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * All tiers display for reference
 */
export function TierLegend({ currentScore }: { currentScore?: number }) {
  const currentTier = currentScore ? getTierForScore(currentScore) : null;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {(Object.entries(REPUTATION_TIERS) as [ReputationTier, typeof REPUTATION_TIERS[ReputationTier]][]).map(([tier, info]) => (
        <div
          key={tier}
          className={`p-3 border transition-all ${currentTier === tier ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
          style={{
            backgroundColor: info.bgColor,
            borderColor: info.borderColor,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{info.icon}</span>
            <span className="font-mono text-xs font-bold" style={{ color: info.color }}>
              {info.name}
            </span>
          </div>
          <div className="font-mono text-[10px] text-zinc-500">
            {info.minScore === Infinity ? '1000+' : `${info.minScore}-${info.maxScore}`}
          </div>
        </div>
      ))}
    </div>
  );
}
