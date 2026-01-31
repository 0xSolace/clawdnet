import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users, apiKeys } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateToken, authMiddleware, hashApiKey } from '../lib/auth';

export const authRouter = new Hono();

// Register new user
const registerSchema = z.object({
  email: z.string().email(),
  handle: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/i),
  name: z.string().max(100).optional(),
});

authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');

  // Check if email or handle already exists
  const existingEmail = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existingEmail.length > 0) {
    return c.json({ error: { code: 'email_taken', message: 'Email already registered' } }, 409);
  }

  const existingHandle = await db.select().from(users).where(eq(users.handle, body.handle)).limit(1);
  if (existingHandle.length > 0) {
    return c.json({ error: { code: 'handle_taken', message: 'Handle already taken' } }, 409);
  }

  // Create user
  const [user] = await db.insert(users).values({
    email: body.email,
    handle: body.handle,
    name: body.name,
  }).returning();

  // Generate token
  const token = await generateToken(user.id);

  return c.json({
    user: {
      id: user.id,
      handle: user.handle,
      email: user.email,
      name: user.name,
    },
    token,
  }, 201);
});

// Login (simplified - in production would use OAuth or magic link)
const loginSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');

  const user = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (user.length === 0) {
    return c.json({ error: { code: 'user_not_found', message: 'No user with this email' } }, 404);
  }

  // In production: send magic link or verify password
  // For now, just return token (INSECURE - for development only)
  const token = await generateToken(user[0].id);

  return c.json({
    user: {
      id: user[0].id,
      handle: user[0].handle,
      email: user[0].email,
      name: user[0].name,
    },
    token,
  });
});

// Get current user
authRouter.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user.length === 0) {
    return c.json({ error: { code: 'user_not_found', message: 'User not found' } }, 404);
  }

  return c.json({
    id: user[0].id,
    handle: user[0].handle,
    email: user[0].email,
    name: user[0].name,
    bio: user[0].bio,
    avatarUrl: user[0].avatarUrl,
    isVerified: user[0].isVerified,
    createdAt: user[0].createdAt,
  });
});

// Create API key
const createApiKeySchema = z.object({
  name: z.string().max(100).optional(),
  scopes: z.array(z.string()).default(['read']),
  expiresInDays: z.number().min(1).max(365).optional(),
});

authRouter.post('/api-keys', authMiddleware, zValidator('json', createApiKeySchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Generate key
  const key = `cn_${nanoid(32)}`;
  const keyPrefix = key.slice(0, 8);
  const keyHash = hashApiKey(key);

  const expiresAt = body.expiresInDays 
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [apiKey] = await db.insert(apiKeys).values({
    userId,
    name: body.name,
    keyHash,
    keyPrefix,
    scopes: body.scopes,
    expiresAt,
  }).returning();

  return c.json({
    id: apiKey.id,
    name: apiKey.name,
    key, // Only returned once!
    keyPrefix,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  }, 201);
});

// List API keys
authRouter.get('/api-keys', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));

  return c.json({
    apiKeys: keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    })),
  });
});

// Delete API key
authRouter.delete('/api-keys/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('id');

  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);
  if (key.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'API key not found' } }, 404);
  }
  if (key[0].userId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Cannot delete another user\'s API key' } }, 403);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

  return c.json({ deleted: true, id: keyId });
});
