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
  icon: string;
  requirements: string[];
}> = {
  none: {
    name: 'Unverified',
    description: 'Agent has not been verified',
    color: '#71717a',
    bgColor: 'rgba(113, 113, 122, 0.1)',
    icon: '○',
    requirements: [],
  },
  basic: {
    name: 'Basic',
    description: 'Endpoint is reachable',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: '✓',
    requirements: ['Endpoint responds to health check'],
  },
  verified: {
    name: 'Verified',
    description: 'Identity and endpoint verified',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: '✓✓',
    requirements: [
      'Endpoint responds to health check',
      'Supports A2A protocol (/.well-known/agent.json)',
      'Owner identity verified',
    ],
  },
  trusted: {
    name: 'Trusted',
    description: 'Fully verified with proven track record',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: '🛡️',
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
 * Verification check result
 */
export interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  message: string;
  details?: Record<string, unknown>;
  required?: boolean;
}

/**
 * Full verification result
 */
export interface VerificationResult {
  passed: boolean;
  level: VerificationLevel;
  score: number;
  checks: VerificationCheck[];
  checkedAt: string;
  nextCheckAt?: string;
  eligibleForUpgrade?: VerificationLevel;
  upgradeBlockers?: string[];
}

/**
 * Endpoint check options
 */
const TIMEOUT_MS = 10000;

/**
 * Check if endpoint is reachable and returns valid response
 */
export async function checkEndpoint(endpoint: string): Promise<{
  reachable: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ClawdNet-Verifier/1.0',
      },
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    
    return {
      reachable: true,
      responseTime,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      reachable: false,
      responseTime: Date.now() - start,
      error: error.name === 'AbortError' ? 'Request timeout' : error.message,
    };
  }
}

/**
 * Check if endpoint supports A2A protocol
 */
export async function checkA2AProtocol(endpoint: string): Promise<{
  supported: boolean;
  version?: string;
  agentInfo?: {
    name?: string;
    description?: string;
    capabilities?: string[];
  };
  error?: string;
}> {
  try {
    // Try common A2A discovery endpoints
    const discoveryUrls = [
      `${endpoint}/.well-known/agent.json`,
      `${endpoint}/agent.json`,
    ];
    
    for (const url of discoveryUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS / 2);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ClawdNet-Verifier/1.0',
          },
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data && (data.name || data.agentId || data.capabilities)) {
            return {
              supported: true,
              version: data.version || data.protocolVersion || '1.0',
              agentInfo: {
                name: data.name,
                description: data.description,
                capabilities: data.capabilities,
              },
            };
          }
        }
      } catch {
        continue;
      }
    }
    
    return { supported: false };
  } catch (error: any) {
    return { supported: false, error: error.message };
  }
}

/**
 * Check if endpoint supports ERC-8004 registration
 */
export async function checkERC8004(endpoint: string): Promise<{
  supported: boolean;
  services?: string[];
  error?: string;
}> {
  try {
    const registrationUrl = `${endpoint}/.well-known/agent-registration`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS / 2);
    
    const response = await fetch(registrationUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ClawdNet-Verifier/1.0',
      },
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && data.services) {
        return {
          supported: true,
          services: data.services.map((s: any) => s.name || s.type),
        };
      }
    }
    
    return { supported: false };
  } catch (error: any) {
    return { supported: false, error: error.message };
  }
}

/**
 * Run full verification suite for an agent
 */
export async function runVerification(agent: {
  id: string;
  handle: string;
  name: string;
  endpoint: string;
  protocols?: string[];
  isVerified: boolean;
  ownerVerified?: boolean;
  stats?: {
    totalTransactions?: number;
    avgRating?: string | number | null;
    uptimePercent?: string | number | null;
  };
  createdAt?: string | Date;
}): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  let score = 0;
  
  // Check 1: Endpoint reachable (required for any verification)
  const endpointCheck = await checkEndpoint(agent.endpoint);
  checks.push({
    name: 'Endpoint Health',
    status: endpointCheck.reachable && endpointCheck.statusCode === 200 ? 'pass' : 'fail',
    message: endpointCheck.reachable 
      ? `Endpoint responded in ${endpointCheck.responseTime}ms (HTTP ${endpointCheck.statusCode})`
      : `Failed to reach endpoint: ${endpointCheck.error}`,
    details: endpointCheck,
    required: true,
  });
  if (endpointCheck.reachable && endpointCheck.statusCode === 200) score += 30;
  
  // Check 2: A2A Protocol Support (required for verified+)
  const a2aCheck = await checkA2AProtocol(agent.endpoint);
  checks.push({
    name: 'A2A Protocol',
    status: a2aCheck.supported ? 'pass' : 'skip',
    message: a2aCheck.supported
      ? `A2A protocol v${a2aCheck.version} detected`
      : 'A2A protocol not detected (/.well-known/agent.json)',
    details: a2aCheck,
    required: false,
  });
  if (a2aCheck.supported) score += 25;
  
  // Check 3: ERC-8004 Support (bonus)
  const erc8004Check = await checkERC8004(agent.endpoint);
  checks.push({
    name: 'ERC-8004 Registration',
    status: erc8004Check.supported ? 'pass' : 'skip',
    message: erc8004Check.supported
      ? `ERC-8004 services: ${erc8004Check.services?.join(', ')}`
      : 'ERC-8004 registration not found',
    details: erc8004Check,
    required: false,
  });
  if (erc8004Check.supported) score += 15;
  
  // Check 4: Response time (bonus)
  if (endpointCheck.reachable && endpointCheck.responseTime) {
    const isFast = endpointCheck.responseTime < 1000;
    checks.push({
      name: 'Response Time',
      status: isFast ? 'pass' : 'skip',
      message: isFast
        ? `Fast response (${endpointCheck.responseTime}ms < 1000ms)`
        : `Response time ${endpointCheck.responseTime}ms (optimize for < 1000ms)`,
    });
    if (isFast) score += 10;
  }
  
  // Check 5: Protocols declared
  const hasProtocols = agent.protocols && agent.protocols.length > 0;
  checks.push({
    name: 'Protocols Declared',
    status: hasProtocols ? 'pass' : 'skip',
    message: hasProtocols
      ? `Supports: ${agent.protocols!.join(', ')}`
      : 'No protocols declared in registry',
  });
  if (hasProtocols) score += 10;
  
  // Check 6: Owner verified
  checks.push({
    name: 'Owner Verified',
    status: agent.ownerVerified ? 'pass' : 'skip',
    message: agent.ownerVerified
      ? 'Owner identity verified via wallet signature'
      : 'Owner identity not verified',
    required: false,
  });
  if (agent.ownerVerified) score += 10;
  
  // Determine verification level
  const endpointOk = endpointCheck.reachable && endpointCheck.statusCode === 200;
  const passed = endpointOk;
  
  let level: VerificationLevel = 'none';
  let eligibleForUpgrade: VerificationLevel | undefined;
  const upgradeBlockers: string[] = [];
  
  if (passed) {
    // Basic: endpoint responds
    level = 'basic';
    
    // Verified: endpoint + protocol + owner
    if (a2aCheck.supported || hasProtocols) {
      if (agent.ownerVerified) {
        level = 'verified';
      } else {
        eligibleForUpgrade = 'verified';
        upgradeBlockers.push('Owner identity not verified');
      }
    } else if (level === 'basic') {
      eligibleForUpgrade = 'verified';
      upgradeBlockers.push('A2A protocol support not detected');
    }
    
    // Trusted: verified + stats
    if (level === 'verified') {
      const stats = agent.stats;
      const transactions = stats?.totalTransactions || 0;
      const rating = Number(stats?.avgRating) || 0;
      const uptime = Number(stats?.uptimePercent) || 0;
      const createdAt = agent.createdAt ? new Date(agent.createdAt) : new Date();
      const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      const trustedBlockers: string[] = [];
      
      if (transactions < 30) trustedBlockers.push(`Need 30+ transactions (current: ${transactions})`);
      if (rating < 4.5) trustedBlockers.push(`Need 4.5+ rating (current: ${rating.toFixed(1)})`);
      if (uptime < 95) trustedBlockers.push(`Need 95%+ uptime (current: ${uptime.toFixed(0)}%)`);
      if (ageInDays < 30) trustedBlockers.push(`Need 30+ days on network (current: ${Math.floor(ageInDays)})`);
      
      if (trustedBlockers.length === 0) {
        level = 'trusted';
      } else {
        eligibleForUpgrade = 'trusted';
        upgradeBlockers.push(...trustedBlockers);
      }
    }
  }
  
  // Calculate next check time (more frequent for lower levels)
  const nextCheckHours = level === 'trusted' ? 168 : level === 'verified' ? 72 : 24;
  const nextCheckAt = new Date(Date.now() + nextCheckHours * 60 * 60 * 1000).toISOString();
  
  return {
    passed,
    level,
    score,
    checks,
    checkedAt: new Date().toISOString(),
    nextCheckAt,
    eligibleForUpgrade: eligibleForUpgrade !== level ? eligibleForUpgrade : undefined,
    upgradeBlockers: upgradeBlockers.length > 0 ? upgradeBlockers : undefined,
  };
}

/**
 * Get verification level based on agent data (without running checks)
 */
export function calculateVerificationLevel(agent: {
  isVerified: boolean;
  verificationLevel?: VerificationLevel;
  endpoint?: string;
  protocols?: string[];
  stats?: {
    totalTransactions?: number;
    avgRating?: string | number | null;
    uptimePercent?: string | number | null;
  };
  createdAt?: string | Date;
}): VerificationLevel {
  // Use stored level if available
  if (agent.verificationLevel && agent.verificationLevel !== 'none') {
    return agent.verificationLevel;
  }
  
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
