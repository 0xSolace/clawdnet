import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getCachedQuery, setCachedQuery } from '@/lib/db';
import { supabase } from '@/lib/db/supabase';
import { sanitizeName, sanitizeDescription, sanitizeUrl, sanitizeCapabilities } from '@/lib/sanitize';

/**
 * Authenticate agent API request
 * Returns the agent if auth succeeds, null otherwise
 */
async function authenticateAgent(request: NextRequest, handle: string) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const apiKey = authHeader.slice(7);
  
  if (!apiKey || !apiKey.startsWith('clawdnet_')) {
    return null;
  }
  
  // Verify API key matches the agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('handle', handle)
    .eq('api_key', apiKey)
    .single();
  
  if (error || !agent) {
    return null;
  }
  
  return agent;
}

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

    // Try Supabase first
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select(`
          *,
          users!agents_owner_id_users_id_fk (id, handle, name, avatar_url),
          agent_stats (*),
          skills (*)
        `)
        .eq('handle', handle)
        .single();

      if (agent && !error) {
        // Get recent reviews
        const { data: reviews } = await supabase
          .from('reviews')
          .select(`
            id, rating, content, created_at,
            users (handle, name)
          `)
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const result = {
          id: agent.id,
          agentId: agent.agent_id,
          handle: agent.handle,
          name: agent.name,
          description: agent.description,
          avatarUrl: agent.avatar_url,
          endpoint: agent.endpoint,
          capabilities: agent.capabilities || [],
          protocols: agent.protocols || ['a2a-v1'],
          trustLevel: agent.trust_level,
          isVerified: agent.is_verified,
          verificationLevel: agent.verification_level || 'none',
          status: agent.status,
          links: agent.links,
          stripeOnboardingComplete: agent.stripe_onboarding_complete || false,
          payoutEnabled: agent.payout_enabled || false,
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
            connectionsCount: agent.agent_stats.connections_count || 0,
          } : null,
          skills: (agent.skills || []).map((s: any) => ({
            id: s.id,
            skillId: s.skill_id,
            price: s.price,
            metadata: s.metadata,
            isActive: s.is_active,
          })),
          recentReviews: (reviews || []).map((r: any) => ({
            id: r.id,
            rating: r.rating,
            content: r.content,
            createdAt: r.created_at,
            user: r.users,
          })),
          source: 'database',
        };

        setCachedQuery(cacheKey, result);
        return NextResponse.json(result);
      }
    } catch (dbError) {
      console.error('Supabase query failed:', dbError);
      // Fall through to mock
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

// PATCH /api/agents/[handle] - Update agent (REQUIRES AUTH)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    
    // AUTHENTICATION REQUIRED
    const authenticatedAgent = await authenticateAgent(request, handle);
    if (!authenticatedAgent) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid API key required in Authorization header' },
        { status: 401 }
      );
    }
    
    const body = await request.json();

    // Sanitize inputs
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = sanitizeName(body.name);
    if (body.description !== undefined) updates.description = sanitizeDescription(body.description);
    if (body.endpoint !== undefined) {
      const sanitizedEndpoint = sanitizeUrl(body.endpoint);
      if (sanitizedEndpoint) updates.endpoint = sanitizedEndpoint;
    }
    if (body.capabilities !== undefined) updates.capabilities = sanitizeCapabilities(body.capabilities);
    if (body.status !== undefined && ['online', 'offline', 'busy'].includes(body.status)) {
      updates.status = body.status;
    }
    if (body.links !== undefined && typeof body.links === 'object') {
      // Sanitize links
      const links: Record<string, string> = {};
      for (const [key, value] of Object.entries(body.links)) {
        if (typeof value === 'string') {
          const sanitizedUrl = sanitizeUrl(value);
          if (sanitizedUrl) links[key] = sanitizedUrl;
        }
      }
      updates.links = links;
    }
    updates.updated_at = new Date().toISOString();

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('handle', handle)
      .select()
      .single();

    if (error) {
      console.error('Supabase update failed:', error);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({
      id: agent.id,
      handle: agent.handle,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      status: agent.status,
      links: agent.links,
      updatedAt: agent.updated_at,
      source: 'database',
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[handle] - Delete agent (REQUIRES AUTH)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // AUTHENTICATION REQUIRED
    const authenticatedAgent = await authenticateAgent(request, handle);
    if (!authenticatedAgent) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid API key required in Authorization header' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('handle', handle);

    if (error) {
      console.error('Supabase delete failed:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      handle,
      message: 'Agent deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
