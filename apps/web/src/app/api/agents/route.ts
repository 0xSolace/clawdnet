import { NextRequest, NextResponse } from 'next/server';
import { db, getCachedQuery, setCachedQuery } from '@/lib/db';
import { agents, agentStats, skills, users } from '@/lib/db/schema';
import { eq, and, ilike, or, desc, asc, SQL } from 'drizzle-orm';

// Timeout wrapper for DB queries
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'reputation';
    const order = searchParams.get('order') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key from query parameters
    const cacheKey = `agents:${JSON.stringify({ skill, status, search, sortBy, order, limit, offset })}`;
    
    // Check cache first
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        cached: true,
      });
    }

    // Build conditions
    const conditions: SQL[] = [eq(agents.isPublic, true)];

    if (status) {
      conditions.push(eq(agents.status, status));
    }

    if (search) {
      const searchCondition = or(
        ilike(agents.name, `%${search}%`),
        ilike(agents.description, `%${search}%`),
        ilike(agents.handle, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    // Determine sort order
    let orderClause;
    if (sortBy === 'reputation') {
      orderClause = order === 'desc' ? desc(agentStats.reputationScore) : asc(agentStats.reputationScore);
    } else if (sortBy === 'transactions') {
      orderClause = order === 'desc' ? desc(agentStats.totalTransactions) : asc(agentStats.totalTransactions);
    } else if (sortBy === 'created') {
      orderClause = order === 'desc' ? desc(agents.createdAt) : asc(agents.createdAt);
    } else {
      orderClause = desc(agents.updatedAt);
    }

    // Wrap DB query in timeout
    const result = await withTimeout(
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
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset)
    );

    // If skill filter is provided, filter by agent skills
    let filteredResult = result;
    if (skill) {
      const agentSkills = await withTimeout(
        db
          .select({ agentId: skills.agentId })
          .from(skills)
          .where(and(ilike(skills.skillId, `%${skill}%`), eq(skills.isActive, true)))
      );

      const agentIdsWithSkill = agentSkills.map(s => s.agentId);
      filteredResult = result.filter(agent => agentIdsWithSkill.includes(agent.id));
    }

    const responseData = {
      agents: filteredResult,
      pagination: {
        limit,
        offset,
        total: filteredResult.length,
      },
      cached: false,
    };

    // Cache the successful result
    setCachedQuery(cacheKey, responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    if (error instanceof Error && error.message === 'DB_TIMEOUT') {
      console.warn('Database timeout in GET /api/agents, returning empty result');
      
      // Return empty array on timeout instead of error
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      const offset = parseInt(searchParams.get('offset') || '0');
      
      return NextResponse.json({
        agents: [],
        pagination: {
          limit,
          offset,
          total: 0,
        },
        cached: false,
        timeout: true,
      });
    }

    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, name, description, endpoint, capabilities } = body;

    // Basic validation
    if (!handle || !name || !endpoint) {
      return NextResponse.json(
        { error: 'handle, name, and endpoint are required' },
        { status: 400 }
      );
    }

    // For MVP, we'll create a default user/owner
    // In production, this would be authenticated
    const ownerId = '00000000-0000-0000-0000-000000000000'; // Default system user

    // Check if agent handle already exists
    const existingAgent = await withTimeout(
      db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.handle, handle))
        .limit(1)
    );

    if (existingAgent.length > 0) {
      return NextResponse.json(
        { error: 'Agent handle already exists' },
        { status: 409 }
      );
    }

    // Create the agent
    const [newAgent] = await withTimeout(
      db
        .insert(agents)
        .values({
          handle,
          ownerId,
          name,
          description,
          endpoint,
          capabilities: Array.isArray(capabilities) ? capabilities : [],
          status: 'offline',
        })
        .returning()
    );

    // Create initial stats entry
    await withTimeout(
      db.insert(agentStats).values({
        agentId: newAgent.id,
      })
    );

    return NextResponse.json(newAgent, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'DB_TIMEOUT') {
      console.warn('Database timeout in POST /api/agents');
      return NextResponse.json(
        { error: 'Request timeout, please try again' },
        { status: 408 }
      );
    }

    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
