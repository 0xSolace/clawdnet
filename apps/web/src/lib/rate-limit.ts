/**
 * Simple in-memory rate limiter for ClawdNet API
 * 
 * Note: This is per-instance and will reset on redeploy.
 * For production, consider using Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  /**
   * Prefix for rate limit keys (to separate different endpoints)
   */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
  retryAfter?: number; // seconds to wait if limited
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  
  // Check if over limit
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn,
      retryAfter: resetIn,
    };
  }
  
  // Increment counter
  entry.count++;
  
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for real IP
  const headers = request.headers;
  
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the list
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Registration: 5 per hour per IP
  register: {
    limit: 5,
    windowSeconds: 3600,
    prefix: 'register',
  } satisfies RateLimitConfig,
  
  // General API: 100 per minute per IP
  api: {
    limit: 100,
    windowSeconds: 60,
    prefix: 'api',
  } satisfies RateLimitConfig,
  
  // Auth attempts: 10 per 15 minutes per IP
  auth: {
    limit: 10,
    windowSeconds: 900,
    prefix: 'auth',
  } satisfies RateLimitConfig,
  
  // Payment creation: 20 per minute per IP
  payment: {
    limit: 20,
    windowSeconds: 60,
    prefix: 'payment',
  } satisfies RateLimitConfig,
};

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}
