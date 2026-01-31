import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users, agents, badges, agentStats } from '../db';
import { eq } from 'drizzle-orm';
import { authMiddleware, optionalAuth } from '../lib/auth';

export const usersRouter = new Hono();

// Get user profile
usersRouter.get('/:handle', optionalAuth, async (c) => {
  const handle = c.req.param('handle');
  const currentUserId = c.get('userId');

  const result = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  
  if (result.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'User not found' } }, 404);
  }

  const user = result[0];
  const isOwnProfile = currentUserId === user.id;

  // Get badges
  const userBadges = await db.select().from(badges).where(eq(badges.userId, user.id));

  // Get agent count
  const userAgents = await db.select({ id: agents.id }).from(agents).where(eq(agents.ownerId, user.id));

  // TODO: Get follower/following counts

  const response: Record<string, unknown> = {
    id: user.id,
    handle: user.handle,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    links: user.links,
    theme: user.theme,
    isVerified: user.isVerified,
    badges: userBadges.map(b => ({
      id: b.badgeId,
      earnedAt: b.earnedAt,
    })),
    stats: {
      agentsCount: userAgents.length,
      followersCount: 0, // TODO
      followingCount: 0, // TODO
    },
    createdAt: user.createdAt,
  };

  // Include private fields if own profile
  if (isOwnProfile) {
    response.email = user.email;
  }

  return c.json(response);
});

// Update user profile
const updateUserSchema = z.object({
  name: z.string().max(100).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  links: z.object({
    website: z.string().url().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }).optional(),
  theme: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
  }).optional(),
});

usersRouter.patch('/:handle', authMiddleware, zValidator('json', updateUserSchema), async (c) => {
  const handle = c.req.param('handle');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Check ownership
  const existing = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (existing.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'User not found' } }, 404);
  }
  if (existing[0].id !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Cannot update another user\'s profile' } }, 403);
  }

  // Update
  const [updated] = await db.update(users)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return c.json({
    id: updated.id,
    handle: updated.handle,
    name: updated.name,
    bio: updated.bio,
    updatedAt: updated.updatedAt,
  });
});

// Get user's agents
usersRouter.get('/:handle/agents', async (c) => {
  const handle = c.req.param('handle');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  // Get user
  const user = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (user.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'User not found' } }, 404);
  }

  // Get agents
  let query = db.select({
    agent: agents,
    stats: agentStats,
  })
    .from(agents)
    .leftJoin(agentStats, eq(agents.id, agentStats.agentId))
    .where(eq(agents.ownerId, user[0].id));

  const results = await query.limit(limit);

  const agentList = results
    .filter(r => !status || r.agent.status === status)
    .map(r => ({
      id: r.agent.id,
      handle: r.agent.handle,
      name: r.agent.name,
      description: r.agent.description,
      status: r.agent.status,
      isVerified: r.agent.isVerified,
      reputation: r.stats?.reputationScore ? parseFloat(r.stats.reputationScore) : 0,
      createdAt: r.agent.createdAt,
    }));

  return c.json({
    agents: agentList,
    total: agentList.length,
  });
});
