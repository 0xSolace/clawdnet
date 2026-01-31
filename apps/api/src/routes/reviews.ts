import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, reviews, agents, users, agentStats } from '../db';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { authMiddleware } from '../lib/auth';

export const reviewsRouter = new Hono();

// Create review
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(1000).optional(),
});

reviewsRouter.post('/agents/:handle/reviews', authMiddleware, zValidator('json', createReviewSchema), async (c) => {
  const userId = c.get('userId');
  const handle = c.req.param('handle');
  const body = c.req.valid('json');

  // Get agent
  const agent = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (agent.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }

  // Check if user already reviewed
  const existing = await db.select().from(reviews)
    .where(and(eq(reviews.agentId, agent[0].id), eq(reviews.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing review
    const [updated] = await db.update(reviews)
      .set({
        rating: body.rating,
        content: body.content,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, existing[0].id))
      .returning();

    await updateAgentRating(agent[0].id);

    return c.json({
      id: updated.id,
      agentId: agent[0].id,
      rating: updated.rating,
      content: updated.content,
      updatedAt: updated.updatedAt,
    });
  }

  // Create new review
  const [review] = await db.insert(reviews).values({
    agentId: agent[0].id,
    userId,
    rating: body.rating,
    content: body.content,
  }).returning();

  await updateAgentRating(agent[0].id);

  // Get user for response
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return c.json({
    id: review.id,
    agent: { id: agent[0].id, handle: agent[0].handle },
    author: { id: user[0].id, handle: user[0].handle },
    rating: review.rating,
    content: review.content,
    createdAt: review.createdAt,
  }, 201);
});

// List reviews for agent
reviewsRouter.get('/agents/:handle/reviews', async (c) => {
  const handle = c.req.param('handle');
  const sort = c.req.query('sort') || 'newest';
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  // Get agent
  const agent = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (agent.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Agent not found' } }, 404);
  }

  // Build order
  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = asc(reviews.createdAt);
      break;
    case 'highest':
      orderBy = desc(reviews.rating);
      break;
    case 'lowest':
      orderBy = asc(reviews.rating);
      break;
    default:
      orderBy = desc(reviews.createdAt);
  }

  // Get reviews with user info
  const reviewList = await db.select({
    review: reviews,
    user: users,
  })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.agentId, agent[0].id))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Get stats
  const stats = await db.select({
    avgRating: sql<number>`AVG(${reviews.rating})::numeric(3,2)`,
    totalReviews: sql<number>`COUNT(*)::int`,
    count5: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 5)::int`,
    count4: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 4)::int`,
    count3: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 3)::int`,
    count2: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 2)::int`,
    count1: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 1)::int`,
  })
    .from(reviews)
    .where(eq(reviews.agentId, agent[0].id));

  return c.json({
    reviews: reviewList.map(r => ({
      id: r.review.id,
      author: r.user ? {
        handle: r.user.handle,
        name: r.user.name,
        avatarUrl: r.user.avatarUrl,
      } : null,
      rating: r.review.rating,
      content: r.review.content,
      createdAt: r.review.createdAt,
    })),
    summary: {
      averageRating: stats[0].avgRating,
      totalReviews: stats[0].totalReviews,
      distribution: {
        5: stats[0].count5,
        4: stats[0].count4,
        3: stats[0].count3,
        2: stats[0].count2,
        1: stats[0].count1,
      },
    },
    hasMore: reviewList.length === limit,
  });
});

// Delete review
reviewsRouter.delete('/reviews/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reviewId = c.req.param('id');

  // Check ownership
  const review = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (review.length === 0) {
    return c.json({ error: { code: 'not_found', message: 'Review not found' } }, 404);
  }
  if (review[0].userId !== userId) {
    return c.json({ error: { code: 'forbidden', message: 'Cannot delete another user\'s review' } }, 403);
  }

  const agentId = review[0].agentId;
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  await updateAgentRating(agentId);

  return c.json({ deleted: true, id: reviewId });
});

// Helper to update agent rating
async function updateAgentRating(agentId: string) {
  const stats = await db.select({
    avgRating: sql<string>`AVG(${reviews.rating})::numeric(3,2)`,
    count: sql<number>`COUNT(*)::int`,
  })
    .from(reviews)
    .where(eq(reviews.agentId, agentId));

  await db.update(agentStats)
    .set({
      avgRating: stats[0].avgRating,
      reviewsCount: stats[0].count,
      updatedAt: new Date(),
    })
    .where(eq(agentStats.agentId, agentId));
}
