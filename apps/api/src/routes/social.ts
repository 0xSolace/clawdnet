import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, follows, feedEvents, agents, users, agentStats } from '../db';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { authMiddleware } from '../lib/auth';

export const socialRouter = new Hono();

// Follow user or agent
const followSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['user', 'agent']),
});

socialRouter.post('/follow', authMiddleware, zValidator('json', followSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Check if target exists
  if (body.targetType === 'user') {
    const user = await db.select().from(users).where(eq(users.id, body.targetId)).limit(1);
    if (user.length === 0) {
      return c.json({ error: { code: 'not_found', message: 'User not found' } }, 404);
    }
  } else {
    const agent = await db.select().from(agents).where(eq(agents.id, body.targetId)).limit(1);
    if (agent.length === 0) {
      return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
    }
  }

  // Check if already following
  const existing = await db.select().from(follows)
    .where(and(
      eq(follows.followerId, userId),
      eq(follows.followeeId, body.targetId),
      eq(follows.followeeType, body.targetType)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({
      following: true,
      target: { id: body.targetId, type: body.targetType },
      message: 'Already following',
    });
  }

  // Create follow
  const [follow] = await db.insert(follows).values({
    followerId: userId,
    followeeId: body.targetId,
    followeeType: body.targetType,
  }).returning();

  return c.json({
    following: true,
    target: { id: body.targetId, type: body.targetType },
    createdAt: follow.createdAt,
  });
});

// Unfollow
socialRouter.delete('/follow', authMiddleware, zValidator('json', followSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  await db.delete(follows)
    .where(and(
      eq(follows.followerId, userId),
      eq(follows.followeeId, body.targetId),
      eq(follows.followeeType, body.targetType)
    ));

  return c.json({
    following: false,
    target: { id: body.targetId, type: body.targetType },
  });
});

// Activity feed
socialRouter.get('/feed', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const before = c.req.query('before');
  const eventType = c.req.query('type');

  // Get followed ids
  const following = await db.select().from(follows).where(eq(follows.followerId, userId));
  const followedIds = following.map(f => f.followeeId);

  if (followedIds.length === 0) {
    return c.json({ items: [], hasMore: false });
  }

  // Build query
  let conditions = [sql`${feedEvents.actorId} = ANY(${followedIds})`];
  
  if (before) {
    conditions.push(lt(feedEvents.createdAt, new Date(before)));
  }
  
  if (eventType) {
    conditions.push(eq(feedEvents.eventType, eventType));
  }

  const events = await db.select()
    .from(feedEvents)
    .where(and(...conditions))
    .orderBy(desc(feedEvents.createdAt))
    .limit(limit + 1);

  const hasMore = events.length > limit;
  const items = events.slice(0, limit);

  return c.json({
    items: items.map(e => ({
      id: e.id,
      type: e.eventType,
      actor: { id: e.actorId, type: e.actorType },
      data: e.data,
      message: e.message,
      createdAt: e.createdAt,
    })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
  });
});

// Trending agents
socialRouter.get('/trending', async (c) => {
  const period = c.req.query('period') || 'week';
  const type = c.req.query('type') || 'agents';
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);

  // For now, just return top agents by reputation
  // TODO: Implement proper trending algorithm
  const results = await db.select({
    agent: agents,
    stats: agentStats,
  })
    .from(agents)
    .leftJoin(agentStats, eq(agents.id, agentStats.agentId))
    .where(eq(agents.isPublic, true))
    .orderBy(desc(agentStats.reputationScore))
    .limit(limit);

  return c.json({
    period,
    type,
    items: results.map((r, i) => ({
      rank: i + 1,
      agent: {
        id: r.agent.id,
        handle: r.agent.handle,
        name: r.agent.name,
        reputation: r.stats?.reputationScore ? parseFloat(r.stats.reputationScore) : 0,
      },
      metrics: {
        transactions: r.stats?.totalTransactions || 0,
        growth: '+0%', // TODO: Calculate actual growth
      },
    })),
  });
});
