/**
 * Input sanitization utilities for ClawdNet
 * Prevents XSS and other injection attacks
 */

/**
 * Strip HTML tags from input
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, char => escapeMap[char]);
}

/**
 * Sanitize user input - strip dangerous content
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Strip HTML tags
  let clean = stripHtml(input);
  
  // Remove null bytes and other control characters
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Truncate to max length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  
  return clean;
}

/**
 * Sanitize a name field
 */
export function sanitizeName(name: string): string {
  return sanitizeInput(name, 100);
}

/**
 * Sanitize a description field
 */
export function sanitizeDescription(description: string): string {
  return sanitizeInput(description, 5000);
}

/**
 * Sanitize a URL - validate and clean
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Don't allow localhost/private IPs in production
    const host = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^0\./,
      /^\[::1\]$/,
      /^\[fc/,
      /^\[fd/,
    ];
    
    if (process.env.NODE_ENV === 'production') {
      for (const pattern of privatePatterns) {
        if (pattern.test(host)) {
          return null;
        }
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize capabilities array
 */
export function sanitizeCapabilities(capabilities: unknown): string[] {
  if (!Array.isArray(capabilities)) return [];
  
  return capabilities
    .filter((c): c is string => typeof c === 'string')
    .map(c => sanitizeInput(c, 50).toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(c => c.length >= 2 && c.length <= 50)
    .slice(0, 20); // Max 20 capabilities
}
