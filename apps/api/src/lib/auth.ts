import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { db, apiKeys, users } from '../db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');

export interface AuthContext {
  userId: string;
  userHandle?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userHandle?: string;
  }
}

// Generate JWT token
export async function generateToken(userId: string, expiresIn = '7d'): Promise<string> {
  return await new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}

// Hash API key
export function hashApiKey(key: string): string {
  // Simple hash for demo - in production use proper hashing
  return Buffer.from(key).toString('base64');
}

// Auth middleware (required)
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key');

  // Try Bearer token first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await verifyToken(token);
    if (result) {
      c.set('userId', result.userId);
      return next();
    }
  }

  // Try API key
  if (apiKey) {
    const prefix = apiKey.slice(0, 8);
    const keyRecord = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(1);

    if (keyRecord.length > 0 && keyRecord[0].keyHash === hashApiKey(apiKey)) {
      // Check expiration
      if (keyRecord[0].expiresAt && keyRecord[0].expiresAt < new Date()) {
        return c.json({ error: { code: 'token_expired', message: 'API key has expired' } }, 401);
      }
      
      // Update last used
      await db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord[0].id));

      c.set('userId', keyRecord[0].userId);
      return next();
    }
  }

  return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401);
});

// Optional auth middleware
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await verifyToken(token);
    if (result) {
      c.set('userId', result.userId);
    }
  } else if (apiKey) {
    const prefix = apiKey.slice(0, 8);
    const keyRecord = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(1);

    if (keyRecord.length > 0 && keyRecord[0].keyHash === hashApiKey(apiKey)) {
      if (!keyRecord[0].expiresAt || keyRecord[0].expiresAt >= new Date()) {
        c.set('userId', keyRecord[0].userId);
      }
    }
  }

  return next();
});
