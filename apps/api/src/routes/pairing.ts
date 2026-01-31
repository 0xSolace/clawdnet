import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, pairings, agents } from '../db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../lib/auth';

export const pairingRouter = new Hono();

// Initialize pairing
const initPairingSchema = z.object({
  name: z.string().max(100).optional(),
});

pairingRouter.post('/init', authMiddleware, zValidator('json', initPairingSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const token = `clawdnet_pair_${nanoid(32)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  const [pairing] = await db.insert(pairings).values({
    userId,
    name: body.name,
    token,
    status: 'pending',
    expiresAt,
  }).returning();

  // Generate QR code data (just the token for now)
  const qrData = token;

  return c.json({
    pairingId: pairing.id,
    token,
    qrCode: qrData, // Client can generate QR from this
    expiresAt: expiresAt.toISOString(),
  });
});

// Confirm pairing (called by Clawdbot)
const confirmPairingSchema = z.object({
  token: z.string(),
  agentId: z.string(),
  instanceInfo: z.object({
    version: z.string().optional(),
    os: z.string().optional(),
    hostname: z.string().optional(),
    nodeVersion: z.string().optional(),
  }).optional(),
});

pairingRouter.post('/confirm', zValidator('json', confirmPairingSchema), async (c) => {
  const body = c.req.valid('json');

  // Find pairing
  const pairing = await db.select().from(pairings)
    .where(and(eq(pairings.token, body.token), eq(pairings.status, 'pending')))
    .limit(1);

  if (pairing.length === 0) {
    return c.json({ error: { code: 'invalid_token', message: 'Invalid or expired pairing token' } }, 400);
  }

  // Check expiration
  if (pairing[0].expiresAt && pairing[0].expiresAt < new Date()) {
    return c.json({ error: { code: 'token_expired', message: 'Pairing token has expired' } }, 400);
  }

  // Verify agent exists
  const agent = await db.select().from(agents).where(eq(agents.id, body.agentId)).limit(1);
  if (agent.length === 0) {
    return c.json({ error: { code: 'agent_not_found', message: 'Agent not found' } }, 404);
  }

  // Generate telemetry token
  const telemetryToken = `telem_${nanoid(32)}`;

  // Update pairing
  const [updated] = await db.update(pairings)
    .set({
      agentId: body.agentId,
      status: 'active',
      instanceInfo: body.instanceInfo,
      telemetryToken,
      lastSeen: new Date(),
      expiresAt: null, // Clear expiration once confirmed
    })
    .where(eq(pairings.id, pairing[0].id))
    .returning();

  return c.json({
    pairingId: updated.id,
    status: 'active',
    agent: {
      id: agent[0].id,
      handle: agent[0].handle,
    },
    websocketUrl: 'wss://api.clawdnet.xyz/telemetry',
    telemetryToken,
    createdAt: updated.createdAt,
  });
});

// Get pairing status
pairingRouter.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const userPairings = await db.select({
    pairing: pairings,
    agent: agents,
  })
    .from(pairings)
    .leftJoin(agents, eq(pairings.agentId, agents.id))
    .where(eq(pairings.userId, userId));

  return c.json({
    pairings: userPairings
      .filter(p => p.pairing.status !== 'pending' || (p.pairing.expiresAt && p.pairing.expiresAt > new Date()))
      .map(p => ({
        id: p.pairing.id,
        name: p.pairing.name,
        agent: p.agent ? {
          id: p.agent.id,
          handle: p.agent.handle,
        } : null,
        status: p.pairing.status,
        instanceInfo: p.pairing.instanceInfo,
        lastSeen: p.pairing.lastSeen,
        createdAt: p.pairing.createdAt,
      })),
    total: userPairings.length,
  });
});

// Delete pairing
pairingRouter.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const pairingId = c.req.param('id');

  // Check ownership
  const pairing = await db.select().from(pairings).where(eq(pairings.id, pairingId)).limit(1);
  if (pairing.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Pairing not found' } }, 404);
  }
  if (pairing[0].userId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Cannot delete another user\'s pairing' } }, 403);
  }

  await db.delete(pairings).where(eq(pairings.id, pairingId));

  return c.json({ deleted: true, id: pairingId });
});

// Heartbeat (called by Clawdbot to update status)
pairingRouter.post('/heartbeat', zValidator('json', z.object({
  telemetryToken: z.string(),
  status: z.enum(['online', 'busy', 'offline']).optional(),
})), async (c) => {
  const body = c.req.valid('json');

  const pairing = await db.select().from(pairings)
    .where(eq(pairings.telemetryToken, body.telemetryToken))
    .limit(1);

  if (pairing.length === 0) {
    return c.json({ error: { code: 'invalid_token', message: 'Invalid telemetry token' } }, 401);
  }

  // Update last seen
  await db.update(pairings)
    .set({ lastSeen: new Date() })
    .where(eq(pairings.id, pairing[0].id));

  // Update agent status if provided
  if (body.status && pairing[0].agentId) {
    await db.update(agents)
      .set({ status: body.status })
      .where(eq(agents.id, pairing[0].agentId));
  }

  return c.json({ ok: true, timestamp: new Date().toISOString() });
});
