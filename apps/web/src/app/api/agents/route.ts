import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getCachedQuery, setCachedQuery } from '@/lib/db';
import { supabase, getAgents, createAgent } from '@/lib/db/supabase';

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

    // Try Supabase first (serverless-friendly REST API)
    try {
      const agents = await getAgents({ limit, offset, status: status || undefined, search: search || undefined });
      
      if (agents && agents.length > 0) {
        // Transform to API format
        const formattedAgents = agents.map((agent: any) => ({
          id: agent.id,
          handle: agent.handle,
          name: agent.name,
          description: agent.description,
          avatarUrl: agent.avatar_url,
          endpoint: agent.endpoint,
          capabilities: agent.capabilities || [],
          protocols: agent.protocols || ['a2a-v1'],
          trustLevel: agent.trust_level,
          isVerified: agent.is_verified,
          status: agent.status,
          links: agent.links,
          x402Support: agent.x402_support || false,
          agentWallet: agent.agent_wallet,
          erc8004Active: agent.erc8004_active || false,
          supportedTrust: agent.supported_trust || [],
          createdAt: agent.created_at,
          updatedAt: agent.updated_at,
          owner: agent.users ? {
            id: agent.users.id,
            handle: agent.users.handle,
            name: agent.users.name,
            avatarUrl: agent.users.avatar_url,
          } : null,
          stats: agent.agent_stats ? {
            reputationScore: agent.agent_stats.reputation_score,
            totalTransactions: agent.agent_stats.total_transactions,
            successfulTransactions: agent.agent_stats.successful_transactions,
            totalRevenue: agent.agent_stats.total_revenue,
            avgResponseMs: agent.agent_stats.avg_response_ms,
            uptimePercent: agent.agent_stats.uptime_percent,
            reviewsCount: agent.agent_stats.reviews_count,
            avgRating: agent.agent_stats.avg_rating,
          } : null,
        }));

        // Get total count
        const { count } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('is_public', true);

        const responseData = {
          agents: formattedAgents,
          pagination: { limit, offset, total: count || formattedAgents.length },
          source: 'database',
        };

        setCachedQuery(cacheKey, responseData);
        return NextResponse.json(responseData);
      }
    } catch (dbError) {
      console.error('Supabase query failed:', dbError);
      // Fall through to mock data
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

    // Try to create in Supabase
    if (ownerId) {
      try {
        const agent = await createAgent({
          handle,
          name,
          description,
          endpoint,
          capabilities: Array.isArray(capabilities) ? capabilities : [],
          ownerId,
        });

        return NextResponse.json({
          ...agent,
          source: 'database',
        }, { status: 201 });

      } catch (dbError: any) {
        if (dbError.code === '23505') { // Unique violation
          return NextResponse.json(
            { error: 'Agent handle already exists' },
            { status: 409 }
          );
        }
        console.error('Supabase insert failed:', dbError);
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
      x402Support: false,
      agentWallet: null,
      erc8004Active: false,
      supportedTrust: [],
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
