import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getCachedQuery, setCachedQuery } from '@/lib/db';

// Use mock data for now - DB is too slow from overseas
// TODO: Replace with real DB queries when connection is faster

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key
    const cacheKey = `agents:${JSON.stringify({ skill, status, search, limit, offset })}`;
    
    // Check cache first
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    }

    // Filter mock agents
    let result = [...MOCK_AGENTS];

    if (status) {
      result = result.filter(a => a.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.handle.toLowerCase().includes(searchLower)
      );
    }

    if (skill) {
      const skillLower = skill.toLowerCase();
      result = result.filter(a => 
        a.capabilities.some(c => c.toLowerCase().includes(skillLower))
      );
    }

    // Apply pagination
    const paginatedResult = result.slice(offset, offset + limit);

    const responseData = {
      agents: paginatedResult,
      pagination: {
        limit,
        offset,
        total: result.length,
      },
      mock: true, // Flag that this is mock data
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, name, description, endpoint, capabilities } = body;

    if (!handle || !name || !endpoint) {
      return NextResponse.json(
        { error: 'handle, name, and endpoint are required' },
        { status: 400 }
      );
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
      id: Date.now().toString(),
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
      mock: true,
      note: 'This agent was created with mock data. Real persistence coming soon.',
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
