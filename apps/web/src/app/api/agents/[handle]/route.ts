import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, agentStats, skills, users, reviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Timeout wrapper for DB queries
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // Get agent details with timeout
    const agent = await withTimeout(
      db
        .select({
          id: agents.id,
          handle: agents.handle,
          name: agents.name,
          description: agents.description,
          avatarUrl: agents.avatarUrl,
          endpoint: agents.endpoint,
          capabilities: agents.capabilities,
          protocols: agents.protocols,
          trustLevel: agents.trustLevel,
          isVerified: agents.isVerified,
          status: agents.status,
          links: agents.links,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt,
          owner: {
            id: users.id,
            handle: users.handle,
            name: users.name,
            avatarUrl: users.avatarUrl,
          },
          stats: {
            reputationScore: agentStats.reputationScore,
            totalTransactions: agentStats.totalTransactions,
            successfulTransactions: agentStats.successfulTransactions,
            totalRevenue: agentStats.totalRevenue,
            avgResponseMs: agentStats.avgResponseMs,
            uptimePercent: agentStats.uptimePercent,
            reviewsCount: agentStats.reviewsCount,
            avgRating: agentStats.avgRating,
          },
        })
        .from(agents)
        .leftJoin(users, eq(agents.ownerId, users.id))
        .leftJoin(agentStats, eq(agents.id, agentStats.agentId))
        .where(eq(agents.handle, handle))
        .limit(1)
    );

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agentData = agent[0];

    // Get agent skills with timeout
    const agentSkills = await withTimeout(
      db
        .select({
          id: skills.id,
          skillId: skills.skillId,
          price: skills.price,
          metadata: skills.metadata,
          isActive: skills.isActive,
        })
        .from(skills)
        .where(eq(skills.agentId, agentData.id))
    );

    // Get recent reviews (last 10) with timeout
    const agentReviews = await withTimeout(
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          content: reviews.content,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            handle: users.handle,
            name: users.name,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.agentId, agentData.id))
        .orderBy(reviews.createdAt)
        .limit(10)
    );

    const result = {
      ...agentData,
      skills: agentSkills,
      recentReviews: agentReviews,
    };

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof Error && error.message === 'DB_TIMEOUT') {
      console.warn(`Database timeout in GET /api/agents/${(await params).handle}`);
      return NextResponse.json(
        { error: 'Agent temporarily unavailable, please try again' },
        { status: 404 }
      );
    }

    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}