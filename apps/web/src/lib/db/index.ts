import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000;

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

// Lazy pool initialization
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('Pool error:', err);
      pool = null;
    });
  }
  if (!pool) {
    throw new Error('DATABASE_URL not configured');
  }
  return pool;
}

export const db = drizzle(getPool(), { schema });

// Demo/mock agents for fallback when DB is unavailable
export const MOCK_AGENTS = [
  {
    id: '1',
    handle: 'sol',
    name: 'Sol',
    description: 'AI assistant for general tasks, research, and creative work.',
    avatarUrl: null,
    endpoint: 'https://api.clawdnet.xyz/agents/sol',
    capabilities: ['text-generation', 'research', 'analysis'],
    protocols: ['a2a-v1'],
    trustLevel: 'directory',
    isVerified: true,
    status: 'online',
    links: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.9', totalTransactions: 1547, successfulTransactions: 1520, totalRevenue: '89.42', avgResponseMs: 1200, uptimePercent: '98.5', reviewsCount: 42, avgRating: '4.8' },
  },
  {
    id: '2',
    handle: 'coder',
    name: 'CodeBot',
    description: 'Specialized code generation. Supports 20+ languages.',
    avatarUrl: null,
    endpoint: 'https://api.clawdnet.xyz/agents/coder',
    capabilities: ['code-generation', 'debugging', 'code-review'],
    protocols: ['a2a-v1'],
    trustLevel: 'directory',
    isVerified: false,
    status: 'online',
    links: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.7', totalTransactions: 892, successfulTransactions: 869, totalRevenue: '34.78', avgResponseMs: 2100, uptimePercent: '96.2', reviewsCount: 28, avgRating: '4.6' },
  },
  {
    id: '3',
    handle: 'artist',
    name: 'ArtGen',
    description: 'Image generation and creative visual content.',
    avatarUrl: null,
    endpoint: 'https://api.clawdnet.xyz/agents/artist',
    capabilities: ['image-generation', 'image-editing', 'style-transfer'],
    protocols: ['a2a-v1'],
    trustLevel: 'directory',
    isVerified: true,
    status: 'busy',
    links: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.8', totalTransactions: 2341, successfulTransactions: 2298, totalRevenue: '156.20', avgResponseMs: 8500, uptimePercent: '94.1', reviewsCount: 89, avgRating: '4.7' },
  },
  {
    id: '4',
    handle: 'researcher',
    name: 'DeepSearch',
    description: 'Web research and information synthesis agent.',
    avatarUrl: null,
    endpoint: 'https://api.clawdnet.xyz/agents/researcher',
    capabilities: ['web-search', 'summarization', 'fact-checking'],
    protocols: ['a2a-v1'],
    trustLevel: 'directory',
    isVerified: false,
    status: 'offline',
    links: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.5', totalTransactions: 456, successfulTransactions: 438, totalRevenue: '22.80', avgResponseMs: 3200, uptimePercent: '89.0', reviewsCount: 15, avgRating: '4.4' },
  },
  {
    id: '5',
    handle: 'translator',
    name: 'PolyGlot',
    description: 'Multi-language translation with 100+ language support.',
    avatarUrl: null,
    endpoint: 'https://api.clawdnet.xyz/agents/translator',
    capabilities: ['translation', 'language-detection', 'localization'],
    protocols: ['a2a-v1'],
    trustLevel: 'directory',
    isVerified: true,
    status: 'online',
    links: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
    stats: { reputationScore: '4.6', totalTransactions: 1123, successfulTransactions: 1098, totalRevenue: '44.92', avgResponseMs: 800, uptimePercent: '97.8', reviewsCount: 34, avgRating: '4.5' },
  },
];
