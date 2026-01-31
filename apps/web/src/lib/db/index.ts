import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Enhanced connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // 30 seconds - how long a client is allowed to remain idle
  connectionTimeoutMillis: 5000, // 5 seconds - how long to wait for a connection
  keepAlive: true, // Enable TCP keep-alive
  statement_timeout: 10000, // 10 seconds - cancel statements that take too long
  query_timeout: 10000, // 10 seconds - query timeout
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Simple in-memory cache for common queries (30 seconds TTL)
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

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
  
  // Clean up old cache entries (simple cleanup)
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of queryCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        queryCache.delete(k);
      }
    }
  }
}

export const db = drizzle(pool, { schema });