/**
 * ClawdNet Reputation System
 * 
 * Calculates reputation scores based on multiple factors:
 * - Transaction volume and success rate
 * - User reviews and ratings
 * - Uptime and reliability
 * - Network age and activity
 */

// Reputation tiers
export type ReputationTier = 'newcomer' | 'active' | 'reliable' | 'trusted' | 'elite' | 'legendary';

export const REPUTATION_TIERS: Record<ReputationTier, {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  newcomer: {
    name: 'Newcomer',
    minScore: 0,
    maxScore: 99,
    color: '#71717a',
    bgColor: 'rgba(113, 113, 122, 0.1)',
    borderColor: 'rgba(113, 113, 122, 0.3)',
    icon: '🌱',
    description: 'New to the network',
  },
  active: {
    name: 'Active',
    minScore: 100,
    maxScore: 299,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: '⚡',
    description: 'Building reputation',
  },
  reliable: {
    name: 'Reliable',
    minScore: 300,
    maxScore: 599,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    icon: '✓',
    description: 'Consistent performer',
  },
  trusted: {
    name: 'Trusted',
    minScore: 600,
    maxScore: 899,
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    icon: '🛡️',
    description: 'Highly reliable',
  },
  elite: {
    name: 'Elite',
    minScore: 900,
    maxScore: 999,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: '⭐',
    description: 'Top performer',
  },
  legendary: {
    name: 'Legendary',
    minScore: 1000,
    maxScore: Infinity,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: '👑',
    description: 'Network legend',
  },
};

// Weight factors for reputation calculation
const WEIGHTS = {
  transactions: 0.25,      // 25% - Volume matters
  successRate: 0.20,       // 20% - Quality of service
  reviews: 0.20,           // 20% - User feedback
  uptime: 0.15,            // 15% - Reliability
  age: 0.10,               // 10% - Network tenure
  connections: 0.10,       // 10% - Network participation
};

// Scoring functions (normalized to 0-100)
function scoreTransactions(count: number): number {
  // Logarithmic scaling: 0 txn = 0, 10 = 50, 100 = 75, 1000 = 100
  if (count <= 0) return 0;
  return Math.min(100, Math.log10(count + 1) * 33.3);
}

function scoreSuccessRate(successful: number, total: number): number {
  if (total === 0) return 50; // Neutral for new agents
  const rate = (successful / total) * 100;
  // Harsh penalty for low success rates
  if (rate < 50) return rate * 0.5;
  if (rate < 80) return 25 + (rate - 50) * 1.25;
  return 62.5 + (rate - 80) * 1.875;
}

function scoreReviews(avgRating: number, reviewCount: number): number {
  if (reviewCount === 0) return 50; // Neutral for new agents
  // Rating contributes 70%, count contributes 30%
  const ratingScore = (avgRating / 5) * 100;
  const countScore = Math.min(100, Math.log10(reviewCount + 1) * 50);
  return ratingScore * 0.7 + countScore * 0.3;
}

function scoreUptime(uptimePercent: number): number {
  // Very harsh penalty below 95%
  if (uptimePercent >= 99.9) return 100;
  if (uptimePercent >= 99) return 95;
  if (uptimePercent >= 95) return 80 + (uptimePercent - 95) * 3;
  if (uptimePercent >= 90) return 50 + (uptimePercent - 90) * 6;
  return uptimePercent * 0.5;
}

function scoreAge(createdAt: Date): number {
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  // 0 days = 20, 30 days = 50, 90 days = 75, 365 days = 95, 730+ days = 100
  if (ageInDays < 7) return 20;
  if (ageInDays < 30) return 20 + (ageInDays - 7) * 1.3;
  if (ageInDays < 90) return 50 + (ageInDays - 30) * 0.42;
  if (ageInDays < 365) return 75 + (ageInDays - 90) * 0.073;
  if (ageInDays < 730) return 95 + (ageInDays - 365) * 0.014;
  return 100;
}

function scoreConnections(count: number): number {
  // 0 = 20, 5 = 50, 20 = 75, 50+ = 100
  if (count <= 0) return 20;
  if (count < 5) return 20 + count * 6;
  if (count < 20) return 50 + (count - 5) * 1.67;
  if (count < 50) return 75 + (count - 20) * 0.83;
  return 100;
}

export interface ReputationInput {
  totalTransactions: number;
  successfulTransactions: number;
  avgRating: number;
  reviewsCount: number;
  uptimePercent: number;
  createdAt: Date;
  connectionsCount: number;
}

export interface ReputationResult {
  score: number;
  normalizedScore: number; // 0-100 display score
  tier: ReputationTier;
  tierInfo: typeof REPUTATION_TIERS[ReputationTier];
  breakdown: {
    transactions: number;
    successRate: number;
    reviews: number;
    uptime: number;
    age: number;
    connections: number;
  };
}

/**
 * Calculate comprehensive reputation score
 */
export function calculateReputation(input: ReputationInput): ReputationResult {
  const breakdown = {
    transactions: scoreTransactions(input.totalTransactions),
    successRate: scoreSuccessRate(input.successfulTransactions, input.totalTransactions),
    reviews: scoreReviews(input.avgRating, input.reviewsCount),
    uptime: scoreUptime(input.uptimePercent),
    age: scoreAge(input.createdAt),
    connections: scoreConnections(input.connectionsCount),
  };
  
  // Weighted sum (0-100 scale)
  const weightedScore = 
    breakdown.transactions * WEIGHTS.transactions +
    breakdown.successRate * WEIGHTS.successRate +
    breakdown.reviews * WEIGHTS.reviews +
    breakdown.uptime * WEIGHTS.uptime +
    breakdown.age * WEIGHTS.age +
    breakdown.connections * WEIGHTS.connections;
  
  // Scale to 0-1000 for display (multiply by 10)
  const score = Math.round(weightedScore * 10);
  
  // Find tier
  const tier = getTierForScore(score);
  
  return {
    score,
    normalizedScore: Math.round(weightedScore),
    tier,
    tierInfo: REPUTATION_TIERS[tier],
    breakdown,
  };
}

/**
 * Get tier for a given score
 */
export function getTierForScore(score: number): ReputationTier {
  for (const [tier, info] of Object.entries(REPUTATION_TIERS) as [ReputationTier, typeof REPUTATION_TIERS[ReputationTier]][]) {
    if (score >= info.minScore && score <= info.maxScore) {
      return tier;
    }
  }
  return 'legendary';
}

/**
 * Get progress to next tier (0-100)
 */
export function getProgressToNextTier(score: number): { progress: number; nextTier: ReputationTier | null } {
  const currentTier = getTierForScore(score);
  const currentInfo = REPUTATION_TIERS[currentTier];
  
  if (currentTier === 'legendary') {
    return { progress: 100, nextTier: null };
  }
  
  const tiers = Object.keys(REPUTATION_TIERS) as ReputationTier[];
  const currentIndex = tiers.indexOf(currentTier);
  const nextTier = tiers[currentIndex + 1] as ReputationTier;
  const nextInfo = REPUTATION_TIERS[nextTier];
  
  const rangeSize = currentInfo.maxScore - currentInfo.minScore + 1;
  const progress = ((score - currentInfo.minScore) / rangeSize) * 100;
  
  return { progress: Math.min(100, Math.max(0, progress)), nextTier };
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  if (score >= 1000) return score.toLocaleString();
  return score.toString();
}

/**
 * Calculate delta description
 */
export function getScoreDelta(oldScore: number, newScore: number): {
  delta: number;
  direction: 'up' | 'down' | 'same';
  description: string;
} {
  const delta = newScore - oldScore;
  
  if (delta === 0) {
    return { delta: 0, direction: 'same', description: 'No change' };
  }
  
  const direction = delta > 0 ? 'up' : 'down';
  const absDelta = Math.abs(delta);
  
  let description: string;
  if (absDelta >= 100) description = 'Major change';
  else if (absDelta >= 50) description = 'Significant change';
  else if (absDelta >= 20) description = 'Moderate change';
  else if (absDelta >= 5) description = 'Small change';
  else description = 'Minor adjustment';
  
  return { delta, direction, description };
}
