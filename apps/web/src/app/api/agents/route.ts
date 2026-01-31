import { NextRequest, NextResponse } from 'next/server';
import { eq, ilike, or, sql, desc, and } from 'drizzle-orm';
import { getDb, MOCK_AGENTS, getCachedQuery, setCachedQuery, queryWithFallback, schema } from '@/lib/db';

// GET /api/agents - List agents with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key
    const cacheKey = `agents:list:${JSON.stringify({ skill, status, search, limit, offset })}`;
    
    // Check cache first
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    }

    // Try to fetch from DB
    const db = getDb();
    if (db) {
      try {
        // Build query conditions
        const conditions = [];
        if (status) conditions.push(eq(schema.agents.status, status));
        if (search) {
          conditions.push(
            or(
              ilike(schema.agents.name, `%${search}%`),
              ilike(schema.agents.description, `%${search}%`),
              ilike(schema.agents.handle, `%${search}%`)
            )
          );
        }
        // TODO: skill filter on array field

        // Execute query with timeout
        const queryPromise = (async () => {
          const agentsQuery = db
            .select()
            .from(schema.agents)
            .leftJoin(schema.agentStats, eq(schema.agents.id, schema.agentStats.agentId))
            .leftJoin(schema.users, eq(schema.agents.ownerId, schema.users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(schema.agents.createdAt))
            .limit(limit)
            .offset(offset);

          const countQuery = db
            .select({ count: sql<number>`count(*)` })
            .from(schema.agents)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

          const [agents, countResult] = await Promise.all([agentsQuery, countQuery]);
          return { agents, total: Number(countResult[0]?.count || 0) };
        })();

        const result = await Promise.race([
          queryPromise,
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 8000)
          ),
        ]);

        if (result) {
          // Transform DB results to API format
          const formattedAgents = result.agents.map(row => ({
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
          }));

          const responseData = {
            agents: formattedAgents,
            pagination: { limit, offset, total: result.total },
            source: 'database',
          };

          setCachedQuery(cacheKey, responseData);
          return NextResponse.json(responseData);
        }
      } catch (dbError) {
        console.error('DB query failed:', dbError);
        // Fall through to mock data
      }
    }

    // Fallback to mock data
    let result = [...MOCK_AGENTS];

    if (status) {
      result = result.filter(a => a.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        (a.description && a.description.toLowerCase().includes(searchLower)) ||
        a.handle.toLowerCase().includes(searchLower)
      );
    }

    if (skill) {
      const skillLower = skill.toLowerCase();
      result = result.filter(a => 
        a.capabilities.some(c => c.toLowerCase().includes(skillLower))
      );
    }

    const paginatedResult = result.slice(offset, offset + limit);

    const responseData = {
      agents: paginatedResult,
      pagination: { limit, offset, total: result.length },
      source: 'mock',
    };

    setCachedQuery(cacheKey, responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in GET /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, name, description, endpoint, capabilities, ownerId } = body;

    if (!handle || !name || !endpoint) {
      return NextResponse.json(
        { error: 'handle, name, and endpoint are required' },
        { status: 400 }
      );
    }

    // Validate handle format (alphanumeric + hyphens, 3-30 chars)
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(handle)) {
      return NextResponse.json(
        { error: 'Invalid handle format. Use lowercase letters, numbers, and hyphens (3-30 chars)' },
        { status: 400 }
      );
    }

    // Try to create in DB
    const db = getDb();
    if (db && ownerId) {
      try {
        // Check if handle exists
        const existing = await db
          .select({ id: schema.agents.id })
          .from(schema.agents)
          .where(eq(schema.agents.handle, handle))
          .limit(1);

        if (existing.length > 0) {
          return NextResponse.json(
            { error: 'Agent handle already exists' },
            { status: 409 }
          );
        }

        // Create agent
        const [newAgent] = await db
          .insert(schema.agents)
          .values({
            handle,
            name,
            description: description || '',
            endpoint,
            capabilities: Array.isArray(capabilities) ? capabilities : [],
            protocols: ['a2a-v1'],
            ownerId,
            status: 'offline',
            trustLevel: 'directory',
            isVerified: false,
          })
          .returning();

        // Create stats entry
        await db
          .insert(schema.agentStats)
          .values({
            agentId: newAgent.id,
            reputationScore: '0',
            totalTransactions: 0,
            successfulTransactions: 0,
            totalRevenue: '0',
          });

        return NextResponse.json({
          ...newAgent,
          source: 'database',
        }, { status: 201 });

      } catch (dbError) {
        console.error('DB insert failed:', dbError);
        // Fall through to mock response
      }
    }

    // Check if handle exists in mock data
    if (MOCK_AGENTS.some(a => a.handle === handle)) {
      return NextResponse.json(
        { error: 'Agent handle already exists' },
        { status: 409 }
      );
    }

    // Return mock created agent (not persisted)
    const newAgent = {
      id: crypto.randomUUID(),
      handle,
      name,
      description: description || '',
      avatarUrl: null,
      endpoint,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      protocols: ['a2a-v1'],
      trustLevel: 'directory',
      isVerified: false,
      status: 'offline',
      links: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock',
      note: 'Agent created with mock data. Sign in to persist.',
    };

    return NextResponse.json(newAgent, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
