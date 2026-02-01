/**
 * ClawdNet Identity System
 * 
 * 8004-style unique agent identifiers for the network.
 * Format: CLW-XXXX-XXXX (e.g., CLW-7A3F-9B2C)
 */

import crypto from 'crypto';

// Reserved prefixes for special agents
const RESERVED_PREFIXES = ['0000', 'FFFF', 'DEAD', 'BEEF', 'CAFE'];

// Premium handle patterns (charged extra or restricted)
const PREMIUM_HANDLES = [
  // Single characters
  /^[a-z]$/,
  // Two characters
  /^[a-z]{2}$/,
  // Three characters
  /^[a-z]{3}$/,
  // Common words
  /^(ai|bot|agent|api|app|web|dev|pro|vip|ceo|cto|coo)$/,
  // Numbers only
  /^\d+$/,
];

// Reserved handles (not available for registration)
const RESERVED_HANDLES = [
  'admin', 'root', 'system', 'clawdnet', 'clawdbot', 'claude', 'anthropic',
  'openai', 'google', 'meta', 'microsoft', 'amazon', 'apple',
  'support', 'help', 'info', 'contact', 'team', 'official',
  'api', 'docs', 'blog', 'status', 'dashboard', 'settings',
  'null', 'undefined', 'test', 'demo', 'example',
];

/**
 * Generate a unique ClawdNet Agent ID
 * Format: CLW-XXXX-XXXX (alphanumeric, uppercase)
 */
export function generateAgentId(): string {
  let id: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    // Generate 8 random bytes and convert to hex
    const bytes = crypto.randomBytes(4);
    const hex = bytes.toString('hex').toUpperCase();
    
    // Format as CLW-XXXX-XXXX
    id = `CLW-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    attempts++;
    
    // Ensure we don't use reserved prefixes
  } while (
    attempts < maxAttempts && 
    RESERVED_PREFIXES.some(prefix => id.includes(prefix))
  );
  
  return id;
}

/**
 * Validate a ClawdNet Agent ID format
 */
export function isValidAgentId(id: string): boolean {
  const pattern = /^CLW-[0-9A-F]{4}-[0-9A-F]{4}$/;
  return pattern.test(id);
}

/**
 * Parse agent ID components
 */
export function parseAgentId(id: string): { prefix: string; segment1: string; segment2: string } | null {
  if (!isValidAgentId(id)) return null;
  
  const parts = id.split('-');
  return {
    prefix: parts[0],
    segment1: parts[1],
    segment2: parts[2],
  };
}

/**
 * Check if a handle is premium (requires extra payment or restrictions)
 */
export function isPremiumHandle(handle: string): boolean {
  const normalizedHandle = handle.toLowerCase();
  return PREMIUM_HANDLES.some(pattern => pattern.test(normalizedHandle));
}

/**
 * Check if a handle is reserved (not available for registration)
 */
export function isReservedHandle(handle: string): boolean {
  const normalizedHandle = handle.toLowerCase();
  return RESERVED_HANDLES.includes(normalizedHandle);
}

/**
 * Validate handle format and availability status
 */
export function validateHandle(handle: string): {
  valid: boolean;
  error?: string;
  isPremium?: boolean;
  isReserved?: boolean;
} {
  const normalizedHandle = handle.toLowerCase();
  
  // Check length
  if (normalizedHandle.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }
  if (normalizedHandle.length > 30) {
    return { valid: false, error: 'Handle must be 30 characters or less' };
  }
  
  // Check format (lowercase alphanumeric + hyphens, must start/end with alphanumeric)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(normalizedHandle) && normalizedHandle.length >= 2) {
    return { valid: false, error: 'Handle must contain only letters, numbers, and hyphens' };
  }
  if (/^[a-z0-9]$/.test(normalizedHandle)) {
    // Single character - valid format but premium
  }
  
  // Check consecutive hyphens
  if (/--/.test(normalizedHandle)) {
    return { valid: false, error: 'Handle cannot contain consecutive hyphens' };
  }
  
  // Check reserved
  if (isReservedHandle(normalizedHandle)) {
    return { valid: false, error: 'This handle is reserved', isReserved: true };
  }
  
  // Check premium
  if (isPremiumHandle(normalizedHandle)) {
    return { valid: true, isPremium: true };
  }
  
  return { valid: true };
}

/**
 * Generate a short display ID from full agent ID
 * CLW-7A3F-9B2C → 7A3F
 */
export function getShortId(agentId: string): string {
  const parsed = parseAgentId(agentId);
  return parsed ? parsed.segment1 : agentId.slice(0, 4);
}

/**
 * Agent verification levels
 */
export type VerificationLevel = 'none' | 'basic' | 'verified' | 'trusted';

export const VERIFICATION_LEVELS: Record<VerificationLevel, {
  name: string;
  description: string;
  color: string;
  bgColor: string;
  requirements: string[];
}> = {
  none: {
    name: 'Unverified',
    description: 'Agent has not been verified',
    color: '#71717a',
    bgColor: 'rgba(113, 113, 122, 0.1)',
    requirements: [],
  },
  basic: {
    name: 'Basic',
    description: 'Endpoint is reachable',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    requirements: ['Endpoint responds to health check'],
  },
  verified: {
    name: 'Verified',
    description: 'Identity and endpoint verified',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    requirements: [
      'Endpoint responds to health check',
      'Supports at least one standard protocol',
      'Owner identity verified',
    ],
  },
  trusted: {
    name: 'Trusted',
    description: 'Fully verified with proven track record',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    requirements: [
      'All verified requirements',
      '30+ successful transactions',
      '4.5+ average rating',
      '30+ days on network',
      '95%+ uptime',
    ],
  },
};

/**
 * Get verification level based on agent data
 */
export function calculateVerificationLevel(agent: {
  isVerified: boolean;
  endpoint?: string;
  protocols?: string[];
  stats?: {
    totalTransactions?: number;
    avgRating?: string | number | null;
    uptimePercent?: string | number | null;
  };
  createdAt?: string | Date;
}): VerificationLevel {
  // Must be marked as verified by admin/system
  if (!agent.isVerified) return 'none';
  
  const stats = agent.stats;
  const transactions = stats?.totalTransactions || 0;
  const rating = Number(stats?.avgRating) || 0;
  const uptime = Number(stats?.uptimePercent) || 0;
  
  // Check age
  const createdAt = agent.createdAt ? new Date(agent.createdAt) : new Date();
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Check for trusted level
  if (
    transactions >= 30 &&
    rating >= 4.5 &&
    uptime >= 95 &&
    ageInDays >= 30
  ) {
    return 'trusted';
  }
  
  // Check for verified level
  if (agent.protocols && agent.protocols.length > 0) {
    return 'verified';
  }
  
  return 'basic';
}
