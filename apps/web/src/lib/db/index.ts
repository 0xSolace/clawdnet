import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Simple in-memory cache with TTL
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export function getCachedQuery(key: string): any | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  queryCache.delete(key);
  return null;
}

export function setCachedQuery(key: string, data: any): void {
  queryCache.set(key, { data, timestamp: Date.now() });
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of queryCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        queryCache.delete(k);
      }
    }
  }
}

// Lazy pool initialization with Supabase pooler
let pool: Pool | null = null;
let poolError: string | null = null;

function getPool(): Pool | null {
  if (poolError) return null;
  if (!pool && process.env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false }, // Required for Supabase
      });
      pool.on('error', (err: Error) => {
        console.error('Pool error:', err);
        poolError = err.message;
        pool = null;
      });
    } catch (err) {
      console.error('Failed to create pool:', err);
      poolError = String(err);
    }
  }
  return pool;
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const p = getPool();
  if (!p) return null;
  if (!dbInstance) {
    dbInstance = drizzle(p, { schema });
  }
  return dbInstance;
}

export const db = {
  get instance() {
    return getDb();
  },
};

export async function queryWithFallback<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  timeoutMs = 8000
): Promise<{ data: T; fromDb: boolean }> {
  const db = getDb();
  if (!db) {
    return { data: fallback, fromDb: false };
  }

  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      ),
    ]);
    return { data: result, fromDb: true };
  } catch (error) {
    console.error('DB query failed, using fallback:', error);
    return { data: fallback, fromDb: false };
  }
}

// Mock agents for fallback
export const MOCK_AGENTS = [
  {
    id: '1', handle: 'sol', name: 'Sol',
    description: 'AI assistant for general tasks, research, and creative work.',
    avatarUrl: null, endpoint: 'https://api.clawdnet.xyz/agents/sol',
    capabilities: ['text-generation', 'research', 'analysis'],
    protocols: ['a2a-v1'], trustLevel: 'directory', isVerified: true, status: 'online',
    links: null, x402Support: false, agentWallet: null, erc8004Active: false, supportedTrust: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'shadow', name: 'Shadow', avatarUrl: null },
    stats: { reputationScore: '4.9', totalTransactions: 1547, successfulTransactions: 1520,
      totalRevenue: '89.42', avgResponseMs: 1200, uptimePercent: '98.5', reviewsCount: 42, avgRating: '4.8' },
  },
  {
    id: '2', handle: 'coder', name: 'CodeBot',
    description: 'Specialized code generation. Supports 20+ languages.',
    avatarUrl: null, endpoint: 'https://api.clawdnet.xyz/agents/coder',
    capabilities: ['code-generation', 'debugging', 'code-review'],
    protocols: ['a2a-v1'], trustLevel: 'directory', isVerified: false, status: 'online',
    links: null, x402Support: false, agentWallet: null, erc8004Active: false, supportedTrust: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.7', totalTransactions: 892, successfulTransactions: 869,
      totalRevenue: '34.78', avgResponseMs: 2100, uptimePercent: '96.2', reviewsCount: 28, avgRating: '4.6' },
  },
  {
    id: '3', handle: 'artist', name: 'ArtGen',
    description: 'Image generation and creative visual content.',
    avatarUrl: null, endpoint: 'https://api.clawdnet.xyz/agents/artist',
    capabilities: ['image-generation', 'image-editing', 'style-transfer'],
    protocols: ['a2a-v1'], trustLevel: 'directory', isVerified: true, status: 'busy',
    links: null, x402Support: false, agentWallet: null, erc8004Active: false, supportedTrust: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.8', totalTransactions: 2341, successfulTransactions: 2298,
      totalRevenue: '156.20', avgResponseMs: 8500, uptimePercent: '94.1', reviewsCount: 89, avgRating: '4.7' },
  },
  {
    id: '4', handle: 'researcher', name: 'DeepSearch',
    description: 'Web research and information synthesis agent.',
    avatarUrl: null, endpoint: 'https://api.clawdnet.xyz/agents/researcher',
    capabilities: ['web-search', 'summarization', 'fact-checking'],
    protocols: ['a2a-v1'], trustLevel: 'directory', isVerified: false, status: 'offline',
    links: null, x402Support: false, agentWallet: null, erc8004Active: false, supportedTrust: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.5', totalTransactions: 456, successfulTransactions: 438,
      totalRevenue: '22.80', avgResponseMs: 3200, uptimePercent: '89.0', reviewsCount: 15, avgRating: '4.4' },
  },
  {
    id: '5', handle: 'translator', name: 'PolyGlot',
    description: 'Multi-language translation with 100+ language support.',
    avatarUrl: null, endpoint: 'https://api.clawdnet.xyz/agents/translator',
    capabilities: ['translation', 'language-detection', 'localization'],
    protocols: ['a2a-v1'], trustLevel: 'directory', isVerified: true, status: 'online',
    links: null, x402Support: false, agentWallet: null, erc8004Active: false, supportedTrust: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.6', totalTransactions: 1123, successfulTransactions: 1098,
      totalRevenue: '44.92', avgResponseMs: 800, uptimePercent: '97.8', reviewsCount: 34, avgRating: '4.5' },
  },
];

export { schema };
