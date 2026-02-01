'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  VerificationDetails, 
  VerificationProgress, 
  VerificationRequirements 
} from './verified-badge';
import { VERIFICATION_LEVELS, type VerificationLevel } from '@/lib/identity';
import { Button } from './ui/button';

interface VerificationSectionProps {
  handle: string;
  isOwner?: boolean;
  theme?: {
    card: string;
    cardBorder: string;
    primary: string;
    text: string;
    textMuted: string;
  };
}

interface VerificationStatus {
  handle: string;
  name: string;
  isVerified: boolean;
  verificationLevel: VerificationLevel;
  lastCheckedAt?: string;
  nextCheckAt?: string;
  latestCheck?: {
    passed: boolean;
    score: number;
    checkedAt: string;
    checks: {
      endpointReachable?: boolean;
      endpointResponseMs?: number;
      a2aSupported?: boolean;
      a2aVersion?: string;
      erc8004Supported?: boolean;
      ownerVerified?: boolean;
    };
  };
  upgradeBlockers?: string[];
  eligibleForUpgrade?: VerificationLevel;
  canRequestVerification?: boolean;
  isOwner?: boolean;
}

export function VerificationSection({ 
  handle, 
  isOwner = false,
  theme = {
    card: '#18181b',
    cardBorder: '#27272a',
    primary: '#22c55e',
    text: '#fafafa',
    textMuted: '#71717a',
  }
}: VerificationSectionProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Fetch verification status
  useEffect(() => {
    fetchStatus();
  }, [handle]);
  
  async function fetchStatus() {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${handle}/verify`);
      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function runVerification() {
    try {
      setVerifying(true);
      setError(null);
      
      const response = await fetch(`/api/agents/${handle}/verify`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      
      const data = await response.json();
      
      // Refetch status to get updated data
      await fetchStatus();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }
  
  if (loading) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 border"
        style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
          <span className="font-mono text-sm" style={{ color: theme.textMuted }}>
            Loading verification status...
          </span>
        </div>
      </motion.section>
    );
  }
  
  if (error && !status) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 border"
        style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
      >
        <div className="text-center py-4">
          <div className="text-xl mb-2">⚠️</div>
          <div className="font-mono text-sm" style={{ color: theme.textMuted }}>
            {error}
          </div>
          <Button 
            onClick={fetchStatus}
            variant="outline"
            className="mt-4 font-mono text-xs"
            style={{ borderColor: theme.cardBorder }}
          >
            Retry
          </Button>
        </div>
      </motion.section>
    );
  }
  
  if (!status) return null;
  
  const levelInfo = VERIFICATION_LEVELS[status.verificationLevel];
  
  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="p-6 border overflow-hidden"
      style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-mono flex items-center gap-2" style={{ color: theme.text }}>
          <span style={{ color: theme.primary }}>//</span> VERIFICATION
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="font-mono text-xs hover:opacity-80 transition-opacity"
          style={{ color: theme.textMuted }}
        >
          {showDetails ? 'HIDE DETAILS' : 'SHOW DETAILS'}
        </button>
      </div>
      
      {/* Progress */}
      <div className="mb-6">
        <VerificationProgress 
          currentLevel={status.verificationLevel}
          score={status.latestCheck?.score}
        />
      </div>
      
      {/* Current status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 flex items-center justify-center text-xl"
            style={{
              backgroundColor: levelInfo.bgColor,
              border: `2px solid ${levelInfo.color}`,
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 5,
            }}
          >
            {status.verificationLevel === 'trusted' ? '🛡️' : 
             status.verificationLevel !== 'none' ? '✓' : '○'}
          </motion.div>
          <div>
            <div 
              className="font-mono text-sm font-bold"
              style={{ color: levelInfo.color }}
            >
              {levelInfo.name.toUpperCase()}
            </div>
            <div className="font-mono text-[10px]" style={{ color: theme.textMuted }}>
              {levelInfo.description}
            </div>
          </div>
        </div>
        
        {(isOwner || status.isOwner) && (
          <Button
            onClick={runVerification}
            disabled={verifying}
            className="font-mono text-xs"
            style={{
              backgroundColor: `${levelInfo.color}20`,
              color: levelInfo.color,
              border: `1px solid ${levelInfo.color}40`,
            }}
          >
            {verifying ? 'CHECKING...' : 'VERIFY NOW'}
          </Button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div 
          className="mb-4 p-3 font-mono text-xs"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}
      
      {/* Detailed checks */}
      {showDetails && status.latestCheck && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mb-4"
        >
          <VerificationDetails
            level={status.verificationLevel}
            checks={status.latestCheck.checks}
            upgradeBlockers={status.upgradeBlockers}
            lastCheckedAt={status.lastCheckedAt}
            isOwner={isOwner || status.isOwner}
            onVerifyClick={runVerification}
            isLoading={verifying}
          />
        </motion.div>
      )}
      
      {/* Upgrade path */}
      {status.eligibleForUpgrade && status.upgradeBlockers && status.upgradeBlockers.length > 0 && (
        <div 
          className="p-4 border mt-4"
          style={{ 
            backgroundColor: `${VERIFICATION_LEVELS[status.eligibleForUpgrade].color}10`,
            borderColor: `${VERIFICATION_LEVELS[status.eligibleForUpgrade].color}30`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span>⬆️</span>
            <span 
              className="font-mono text-xs font-bold"
              style={{ color: VERIFICATION_LEVELS[status.eligibleForUpgrade].color }}
            >
              UPGRADE TO {VERIFICATION_LEVELS[status.eligibleForUpgrade].name.toUpperCase()}
            </span>
          </div>
          <ul className="space-y-2">
            {status.upgradeBlockers.map((blocker, i) => (
              <li 
                key={i}
                className="font-mono text-xs flex items-start gap-2"
                style={{ color: theme.textMuted }}
              >
                <span style={{ color: VERIFICATION_LEVELS[status.eligibleForUpgrade!].color }}>→</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Last check info */}
      {status.lastCheckedAt && (
        <div 
          className="text-right font-mono text-[10px] mt-4"
          style={{ color: theme.textMuted }}
        >
          Last verified: {new Date(status.lastCheckedAt).toLocaleString()}
          {status.nextCheckAt && (
            <span className="ml-2">
              · Next check: {new Date(status.nextCheckAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </motion.section>
  );
}

/**
 * Compact verification badge for lists
 */
export function VerificationBadgeCompact({
  level,
  showTooltip = true,
}: {
  level: VerificationLevel;
  showTooltip?: boolean;
}) {
  if (level === 'none') return null;
  
  const info = VERIFICATION_LEVELS[level];
  
  return (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px]"
      style={{
        backgroundColor: info.bgColor,
        color: info.color,
        border: `1px solid ${info.color}30`,
      }}
      title={showTooltip ? info.description : undefined}
    >
      <span>{info.icon}</span>
      <span>{info.name.toUpperCase()}</span>
    </div>
  );
}
