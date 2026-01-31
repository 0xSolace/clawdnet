import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, MOCK_AGENTS, getCachedQuery, setCachedQuery, schema } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const cacheKey = `agent:${handle}`;

    // Check cache
    const cached = getCachedQuery(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Try DB first
    const db = getDb();
    if (db) {
      try {
        const queryPromise = (async () => {
          // Get agent with owner and stats
          const agentResult = await db
            .select()
            .from(schema.agents)
            .leftJoin(schema.agentStats, eq(schema.agents.id, schema.agentStats.agentId))
            .leftJoin(schema.users, eq(schema.agents.ownerId, schema.users.id))
            .where(eq(schema.agents.handle, handle))
            .limit(1);

          if (agentResult.length === 0) return null;

          const row = agentResult[0];
          const agentId = row.agents.id;

          // Get skills
          const skills = await db
            .select()
            .from(schema.skills)
            .where(eq(schema.skills.agentId, agentId));

          // Get recent reviews
          const reviews = await db
            .select({
              id: schema.reviews.id,
              rating: schema.reviews.rating,
              content: schema.reviews.content,
              createdAt: schema.reviews.createdAt,
              user: {
                handle: schema.users.handle,
                name: schema.users.name,
              },
            })
            .from(schema.reviews)
            .leftJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
            .where(eq(schema.reviews.agentId, agentId))
            .orderBy(desc(schema.reviews.createdAt))
            .limit(5);

          return {
            id: row.agents.id,
            handle: row.agents.handle,
            name: row.agents.name,
            description: row.agents.description,
            avatarUrl: row.agents.avatarUrl,
            endpoint: row.agents.endpoint,
            capabilities: row.agents.capabilities || [],
            protocols: row.agents.protocols || ['a2a-v1'],
            trustLevel: row.agents.trustLevel,
            isVerified: row.agents.isVerified,
            status: row.agents.status,
            links: row.agents.links,
            createdAt: row.agents.createdAt?.toISOString(),
            updatedAt: row.agents.updatedAt?.toISOString(),
            owner: row.users ? {
              id: row.users.id,
              handle: row.users.handle,
              name: row.users.name,
              avatarUrl: row.users.avatarUrl,
            } : null,
            stats: row.agent_stats ? {
              reputationScore: row.agent_stats.reputationScore,
              totalTransactions: row.agent_stats.totalTransactions,
              successfulTransactions: row.agent_stats.successfulTransactions,
              totalRevenue: row.agent_stats.totalRevenue,
              avgResponseMs: row.agent_stats.avgResponseMs,
              uptimePercent: row.agent_stats.uptimePercent,
              reviewsCount: row.agent_stats.reviewsCount,
              avgRating: row.agent_stats.avgRating,
            } : null,
            skills: skills.map(s => ({
              id: s.id,
              skillId: s.skillId,
              price: s.price,
              metadata: s.metadata,
              isActive: s.isActive,
            })),
            recentReviews: reviews.map(r => ({
              id: r.id,
              rating: r.rating,
              content: r.content,
              createdAt: r.createdAt?.toISOString(),
              user: r.user,
            })),
            source: 'database',
          };
        })();

        const result = await Promise.race([
          queryPromise,
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 8000)
          ),
        ]);

        if (result) {
          setCachedQuery(cacheKey, result);
          return NextResponse.json(result);
        }
      } catch (dbError) {
        console.error('DB query failed:', dbError);
        // Fall through to mock
      }
    }

    // Fallback: Find agent in mock data
    const agent = MOCK_AGENTS.find(a => a.handle === handle);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Add mock skills and reviews
    const result = {
      ...agent,
      skills: [
        { id: '1', skillId: agent.capabilities[0] || 'general', price: '0.01', metadata: null, isActive: true },
        ...(agent.capabilities.slice(1).map((cap, i) => ({
          id: String(i + 2),
          skillId: cap,
          price: (0.01 * (i + 2)).toFixed(2),
          metadata: null,
          isActive: true,
        }))),
      ],
      recentReviews: [
        {
          id: '1',
          rating: 5,
          content: 'Excellent service, fast response times!',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: { handle: 'user1', name: 'Happy User' },
        },
        {
          id: '2',
          rating: 4,
          content: 'Great results, would use again.',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          user: { handle: 'user2', name: 'Satisfied Customer' },
        },
      ],
      source: 'mock',
    };

    setCachedQuery(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[handle] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();
    const { name, description, endpoint, capabilities, status, links } = body;

    // In a real implementation, verify ownership here
    // For now, just return mock response

    const agent = MOCK_AGENTS.find(a => a.handle === handle);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const updatedAgent = {
      ...agent,
      name: name ?? agent.name,
      description: description ?? agent.description,
      endpoint: endpoint ?? agent.endpoint,
      capabilities: capabilities ?? agent.capabilities,
      status: status ?? agent.status,
      links: links ?? agent.links,
      updatedAt: new Date().toISOString(),
      source: 'mock',
      note: 'Updates not persisted without auth',
    };

    return NextResponse.json(updatedAgent);

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[handle] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // In a real implementation, verify ownership here
    const agent = MOCK_AGENTS.find(a => a.handle === handle);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      handle,
      source: 'mock',
      note: 'Deletion not persisted without auth'
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
