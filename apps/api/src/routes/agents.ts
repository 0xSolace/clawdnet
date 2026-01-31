import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, agents, skills, agentStats, users } from '../db';
import { eq, and, ilike, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authMiddleware, optionalAuth } from '../lib/auth';

export const agentsRouter = new Hono();

// List/Search agents
const listAgentsSchema = z.object({
  skill: z.string().optional(),
  maxPrice: z.string().optional(),
  minReputation: z.string().optional(),
  status: z.enum(['online', 'busy', 'offline']).optional(),
  verified: z.string().optional(),
  limit: z.string().default('20'),
  offset: z.string().default('0'),
  sort: z.enum(['reputation', 'newest', 'price_asc', 'price_desc']).default('reputation'),
});

agentsRouter.get('/', zValidator('query', listAgentsSchema), async (c) => {
  const query = c.req.valid('query');
  const limit = Math.min(parseInt(query.limit), 100);
  const offset = parseInt(query.offset);

  // Build query conditions
  const conditions = [eq(agents.isPublic, true)];
  
  if (query.status) {
    conditions.push(eq(agents.status, query.status));
  }
  
  if (query.verified === 'true') {
    conditions.push(eq(agents.isVerified, true));
  }

  // Get agents with stats
  const results = await db.select({
    agent: agents,
    stats: agentStats,
  })
    .from(agents)
    .leftJoin(agentStats, eq(agents.id, agentStats.agentId))
    .where(and(...conditions))
    .orderBy(desc(agentStats.reputationScore))
    .limit(limit)
    .offset(offset);

  // Get skills for each agent
  const agentIds = results.map(r => r.agent.id);
  const agentSkills = agentIds.length > 0 
    ? await db.select().from(skills).where(sql`${skills.agentId} = ANY(${agentIds})`)
    : [];

  // Build response
  const agentList = results.map(r => {
    const agentSkillsList = agentSkills.filter(s => s.agentId === r.agent.id);
    return {
      id: r.agent.id,
      handle: r.agent.handle,
      name: r.agent.name,
      description: r.agent.description,
      status: r.agent.status,
      isVerified: r.agent.isVerified,
      skills: agentSkillsList.map(s => ({
        id: s.skillId,
        price: s.price,
      })),
      reputation: r.stats?.reputationScore ? parseFloat(r.stats.reputationScore) : 0,
      stats: r.stats ? {
        transactions: r.stats.totalTransactions,
        avgResponseMs: r.stats.avgResponseMs,
        rating: r.stats.avgRating ? parseFloat(r.stats.avgRating) : null,
      } : null,
    };
  });

  // Filter by skill if specified
  let filtered = agentList;
  if (query.skill) {
    filtered = agentList.filter(a => a.skills.some(s => s.id === query.skill));
  }
  if (query.maxPrice) {
    const maxPrice = parseFloat(query.maxPrice);
    filtered = filtered.filter(a => a.skills.some(s => parseFloat(s.price) <= maxPrice));
  }
  if (query.minReputation) {
    const minRep = parseFloat(query.minReputation);
    filtered = filtered.filter(a => a.reputation >= minRep);
  }

  return c.json({
    agents: filtered,
    total: filtered.length,
    hasMore: results.length === limit,
  });
});

// Get single agent
agentsRouter.get('/:handle', async (c) => {
  const handle = c.req.param('handle');

  const result = await db.select({
    agent: agents,
    stats: agentStats,
    owner: users,
  })
    .from(agents)
    .leftJoin(agentStats, eq(agents.id, agentStats.agentId))
    .leftJoin(users, eq(agents.ownerId, users.id))
    .where(eq(agents.handle, handle))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }

  const { agent, stats, owner } = result[0];

  // Get skills
  const agentSkills = await db.select().from(skills).where(eq(skills.agentId, agent.id));

  return c.json({
    id: agent.id,
    handle: agent.handle,
    name: agent.name,
    description: agent.description,
    avatarUrl: agent.avatarUrl,
    endpoint: agent.endpoint,
    capabilities: agent.capabilities,
    protocols: agent.protocols,
    trustLevel: agent.trustLevel,
    isVerified: agent.isVerified,
    status: agent.status,
    links: agent.links,
    owner: owner ? {
      handle: owner.handle,
      name: owner.name,
    } : null,
    skills: agentSkills.map(s => ({
      id: s.skillId,
      price: s.price,
      metadata: s.metadata,
    })),
    stats: stats ? {
      reputation: parseFloat(stats.reputationScore || '0'),
      transactions: stats.totalTransactions,
      successRate: stats.totalTransactions && stats.totalTransactions > 0 
        ? (stats.successfulTransactions! / stats.totalTransactions * 100).toFixed(1)
        : null,
      avgResponseMs: stats.avgResponseMs,
      rating: stats.avgRating ? parseFloat(stats.avgRating) : null,
      reviewsCount: stats.reviewsCount,
    } : null,
    createdAt: agent.createdAt,
  });
});

// Register new agent
const registerAgentSchema = z.object({
  name: z.string().min(1).max(100),
  handle: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/i).optional(),
  endpoint: z.string().url(),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()).optional(),
  skills: z.array(z.object({
    id: z.string(),
    price: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  trustLevel: z.enum(['open', 'directory', 'allowlist', 'private']).default('directory'),
});

agentsRouter.post('/', authMiddleware, zValidator('json', registerAgentSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Generate handle if not provided
  const handle = body.handle || `agent-${nanoid(8)}`;

  // Check if handle is taken
  const existing = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: { code: 'handle_taken', message: 'Handle already in use' } }, 409);
  }

  // Create agent
  const [newAgent] = await db.insert(agents).values({
    handle,
    ownerId: userId,
    name: body.name,
    description: body.description,
    endpoint: body.endpoint,
    capabilities: body.capabilities,
    trustLevel: body.trustLevel,
    status: 'offline',
  }).returning();

  // Create stats record
  await db.insert(agentStats).values({
    agentId: newAgent.id,
  });

  // Add skills if provided
  if (body.skills && body.skills.length > 0) {
    await db.insert(skills).values(
      body.skills.map(s => ({
        agentId: newAgent.id,
        skillId: s.id,
        price: s.price,
        metadata: s.metadata,
      }))
    );
  }

  // TODO: Trigger verification flow

  return c.json({
    id: newAgent.id,
    handle: newAgent.handle,
    status: 'pending_verification',
    verification: {
      challengeUrl: `${body.endpoint}/verify?token=${nanoid(32)}`,
    },
  }, 201);
});

// Update agent
const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  endpoint: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  trustLevel: z.enum(['open', 'directory', 'allowlist', 'private']).optional(),
  links: z.object({
    website: z.string().url().optional(),
    github: z.string().url().optional(),
    docs: z.string().url().optional(),
  }).optional(),
});

agentsRouter.patch('/:handle', authMiddleware, zValidator('json', updateAgentSchema), async (c) => {
  const userId = c.get('userId');
  const handle = c.req.param('handle');
  const body = c.req.valid('json');

  // Check ownership
  const existing = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (existing.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }
  if (existing[0].ownerId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Not the owner of this agent' } }, 403);
  }

  // Update
  const [updated] = await db.update(agents)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(agents.handle, handle))
    .returning();

  return c.json({
    id: updated.id,
    handle: updated.handle,
    updatedAt: updated.updatedAt,
  });
});

// Delete agent
agentsRouter.delete('/:handle', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const handle = c.req.param('handle');

  // Check ownership
  const existing = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (existing.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }
  if (existing[0].ownerId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Not the owner of this agent' } }, 403);
  }

  // Delete (cascades to skills, stats, reviews via FK)
  await db.delete(agents).where(eq(agents.handle, handle));

  return c.json({
    deleted: true,
    handle,
    deletedAt: new Date().toISOString(),
  });
});

// Update agent skills
const updateSkillsSchema = z.object({
  skills: z.array(z.object({
    id: z.string(),
    price: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })),
});

agentsRouter.put('/:handle/skills', authMiddleware, zValidator('json', updateSkillsSchema), async (c) => {
  const userId = c.get('userId');
  const handle = c.req.param('handle');
  const body = c.req.valid('json');

  // Check ownership
  const existing = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (existing.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }
  if (existing[0].ownerId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Not the owner of this agent' } }, 403);
  }

  const agentId = existing[0].id;

  // Delete existing skills and insert new ones
  await db.delete(skills).where(eq(skills.agentId, agentId));
  
  if (body.skills.length > 0) {
    await db.insert(skills).values(
      body.skills.map(s => ({
        agentId,
        skillId: s.id,
        price: s.price,
        metadata: s.metadata,
      }))
    );
  }

  return c.json({
    handle,
    skills: body.skills,
    updatedAt: new Date().toISOString(),
  });
});
