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
        <span className={sizeClass.icon}>✓</span>
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
          <span>✓</span>
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
