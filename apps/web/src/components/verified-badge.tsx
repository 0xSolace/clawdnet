'use client';

import { motion } from 'framer-motion';
import { VERIFICATION_LEVELS, type VerificationLevel } from '@/lib/identity';

interface VerifiedBadgeProps {
  level?: VerificationLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: { badge: 'w-3 h-3', text: 'text-[8px]', icon: 'text-[8px]' },
  sm: { badge: 'w-4 h-4', text: 'text-[10px]', icon: 'text-xs' },
  md: { badge: 'w-6 h-6', text: 'text-xs', icon: 'text-sm' },
  lg: { badge: 'w-8 h-8', text: 'text-sm', icon: 'text-base' },
};

export function VerifiedBadge({
  level = 'verified',
  size = 'sm',
  showLabel = false,
  animated = true,
  className = '',
}: VerifiedBadgeProps) {
  if (level === 'none') return null;
  
  const levelInfo = VERIFICATION_LEVELS[level];
  const sizeClass = sizeConfig[size];
  
  const badge = (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={levelInfo.description}
    >
      <motion.div
        className={`${sizeClass.badge} flex items-center justify-center font-bold`}
        style={{
          backgroundColor: levelInfo.bgColor,
          color: levelInfo.color,
          border: `1px solid ${levelInfo.color}40`,
        }}
        initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
        animate={animated ? { scale: 1, opacity: 1 } : undefined}
        whileHover={animated ? { scale: 1.1 } : undefined}
      >
        <span className={sizeClass.icon}>{levelInfo.icon}</span>
      </motion.div>
      
      {showLabel && (
        <span
          className={`font-mono ${sizeClass.text} font-medium`}
          style={{ color: levelInfo.color }}
        >
          {levelInfo.name.toUpperCase()}
        </span>
      )}
    </div>
  );
  
  return badge;
}

/**
 * Prominent verified badge for profile headers
 */
export function VerifiedBadgeLarge({
  level = 'verified',
  className = '',
}: {
  level?: VerificationLevel;
  className?: string;
}) {
  if (level === 'none') return null;
  
  const levelInfo = VERIFICATION_LEVELS[level];
  
  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 ${className}`}
      style={{
        backgroundColor: levelInfo.bgColor,
        border: `1px solid ${levelInfo.color}40`,
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <motion.span
        className="text-lg"
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        {level === 'trusted' ? '🛡️' : '✓'}
      </motion.span>
      <div>
        <div
          className="font-mono text-xs font-bold"
          style={{ color: levelInfo.color }}
        >
          {levelInfo.name.toUpperCase()}
        </div>
        <div className="font-mono text-[10px] text-zinc-500">
          {levelInfo.description}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Verification status indicator with tooltip
 */
export function VerificationIndicator({
  isVerified,
  level,
  compact = false,
}: {
  isVerified: boolean;
  level?: VerificationLevel;
  compact?: boolean;
}) {
  const actualLevel = isVerified ? (level || 'verified') : 'none';
  const levelInfo = VERIFICATION_LEVELS[actualLevel];
  
  if (!isVerified && compact) return null;
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] ${compact ? '' : 'border'}`}
      style={{
        backgroundColor: levelInfo.bgColor,
        borderColor: `${levelInfo.color}30`,
        color: levelInfo.color,
      }}
    >
      {isVerified ? (
        <>
          <span>{levelInfo.icon}</span>
          {!compact && <span>{levelInfo.name}</span>}
        </>
      ) : (
        <>
          <span>○</span>
          {!compact && <span>Unverified</span>}
        </>
      )}
    </div>
  );
}

/**
 * Detailed verification status card showing what's verified
 */
export function VerificationDetails({
  level,
  checks,
  upgradeBlockers,
  onVerifyClick,
  isOwner = false,
  isLoading = false,
  lastCheckedAt,
}: {
  level: VerificationLevel;
  checks?: {
    endpointReachable?: boolean;
    endpointResponseMs?: number;
    a2aSupported?: boolean;
    a2aVersion?: string;
    erc8004Supported?: boolean;
    ownerVerified?: boolean;
  };
  upgradeBlockers?: string[];
  onVerifyClick?: () => void;
  isOwner?: boolean;
  isLoading?: boolean;
  lastCheckedAt?: string;
}) {
  const levelInfo = VERIFICATION_LEVELS[level];
  
  const checkItems = [
    {
      name: 'Endpoint Health',
      passed: checks?.endpointReachable,
      detail: checks?.endpointResponseMs ? `${checks.endpointResponseMs}ms` : undefined,
      required: true,
    },
    {
      name: 'A2A Protocol',
      passed: checks?.a2aSupported,
      detail: checks?.a2aVersion ? `v${checks.a2aVersion}` : undefined,
      required: false,
    },
    {
      name: 'ERC-8004',
      passed: checks?.erc8004Supported,
      required: false,
    },
    {
      name: 'Owner Verified',
      passed: checks?.ownerVerified,
      required: false,
    },
  ];
  
  return (
    <div
      className="p-4 border"
      style={{ backgroundColor: levelInfo.bgColor, borderColor: `${levelInfo.color}30` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{level === 'trusted' ? '🛡️' : level !== 'none' ? '✓' : '○'}</span>
          <div>
            <div
              className="font-mono text-sm font-bold"
              style={{ color: levelInfo.color }}
            >
              {levelInfo.name.toUpperCase()}
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              {levelInfo.description}
            </div>
          </div>
        </div>
        
        {isOwner && onVerifyClick && (
          <button
            onClick={onVerifyClick}
            disabled={isLoading}
            className="px-3 py-1.5 font-mono text-xs border transition-all hover:scale-105 disabled:opacity-50"
            style={{
              borderColor: `${levelInfo.color}40`,
              color: levelInfo.color,
              backgroundColor: 'transparent',
            }}
          >
            {isLoading ? '...' : 'VERIFY NOW'}
          </button>
        )}
      </div>
      
      {/* Checks */}
      {checks && (
        <div className="space-y-2 mb-4">
          {checkItems.map((check, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 font-mono text-xs"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: check.passed ? '#22c55e' : '#71717a' }}>
                  {check.passed ? '✓' : '○'}
                </span>
                <span className="text-zinc-300">{check.name}</span>
                {check.required && (
                  <span className="text-zinc-500 text-[10px]">required</span>
                )}
              </div>
              {check.detail && (
                <span className="text-zinc-500">{check.detail}</span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Upgrade blockers */}
      {upgradeBlockers && upgradeBlockers.length > 0 && (
        <div className="border-t pt-3 mt-3" style={{ borderColor: `${levelInfo.color}20` }}>
          <div className="font-mono text-[10px] text-zinc-500 mb-2">
            TO UPGRADE:
          </div>
          <ul className="space-y-1">
            {upgradeBlockers.map((blocker, i) => (
              <li
                key={i}
                className="font-mono text-[10px] flex items-start gap-1.5"
                style={{ color: levelInfo.color }}
              >
                <span>→</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Last checked */}
      {lastCheckedAt && (
        <div className="text-right font-mono text-[10px] text-zinc-500 mt-3">
          Last verified: {new Date(lastCheckedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

/**
 * Requirements list for each verification level
 */
export function VerificationRequirements({
  targetLevel,
  currentLevel = 'none',
}: {
  targetLevel: VerificationLevel;
  currentLevel?: VerificationLevel;
}) {
  const levelInfo = VERIFICATION_LEVELS[targetLevel];
  const levels: VerificationLevel[] = ['none', 'basic', 'verified', 'trusted'];
  const currentIndex = levels.indexOf(currentLevel);
  const targetIndex = levels.indexOf(targetLevel);
  
  if (targetIndex <= currentIndex) {
    return (
      <div className="font-mono text-xs text-zinc-500">
        ✓ Already {targetLevel === currentLevel ? 'at' : 'past'} {levelInfo.name} level
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div
        className="font-mono text-xs font-bold"
        style={{ color: levelInfo.color }}
      >
        {levelInfo.name.toUpperCase()} REQUIREMENTS
      </div>
      <ul className="space-y-1">
        {levelInfo.requirements.map((req, i) => (
          <li
            key={i}
            className="font-mono text-xs flex items-start gap-2 text-zinc-400"
          >
            <span style={{ color: levelInfo.color }}>○</span>
            <span>{req}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Progress indicator showing path to next level
 */
export function VerificationProgress({
  currentLevel = 'none',
  score = 0,
}: {
  currentLevel?: VerificationLevel;
  score?: number;
}) {
  const levels: VerificationLevel[] = ['none', 'basic', 'verified', 'trusted'];
  const currentIndex = levels.indexOf(currentLevel);
  
  return (
    <div className="space-y-3">
      {/* Level indicators */}
      <div className="flex items-center gap-1">
        {levels.map((level, i) => {
          const info = VERIFICATION_LEVELS[level];
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          
          return (
            <div key={level} className="flex items-center flex-1">
              <motion.div
                className={`w-8 h-8 flex items-center justify-center font-mono text-xs
                  ${isCurrent ? 'ring-2' : ''}`}
                style={{
                  backgroundColor: isPast || isCurrent ? info.bgColor : 'rgba(113,113,122,0.1)',
                  color: isPast || isCurrent ? info.color : '#71717a',
                  borderColor: info.color,
                  boxShadow: isCurrent ? `0 0 0 2px ${info.color}` : undefined,
                }}
                initial={isCurrent ? { scale: 0.9 } : undefined}
                animate={isCurrent ? { scale: 1 } : undefined}
              >
                {isPast ? '✓' : i}
              </motion.div>
              {i < levels.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1"
                  style={{
                    backgroundColor: i < currentIndex ? VERIFICATION_LEVELS[levels[i + 1]].color : '#3f3f46',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between">
        {levels.map((level) => (
          <div
            key={level}
            className="font-mono text-[10px] text-center"
            style={{ color: VERIFICATION_LEVELS[level].color, width: '25%' }}
          >
            {VERIFICATION_LEVELS[level].name}
          </div>
        ))}
      </div>
      
      {/* Score bar */}
      {score > 0 && (
        <div className="mt-2">
          <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-1">
            <span>Verification Score</span>
            <span>{score}/100</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: VERIFICATION_LEVELS[currentLevel].color }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
