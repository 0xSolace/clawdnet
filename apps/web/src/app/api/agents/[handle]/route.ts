import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getCachedQuery, setCachedQuery } from '@/lib/db';
import { supabase } from '@/lib/db/supabase';

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

// PATCH /api/agents/[handle] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();

    // Try Supabase
    try {
      const updates: Record<string, any> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.endpoint !== undefined) updates.endpoint = body.endpoint;
      if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
      if (body.status !== undefined) updates.status = body.status;
      if (body.links !== undefined) updates.links = body.links;
      updates.updated_at = new Date().toISOString();

      const { data: agent, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('handle', handle)
        .select()
        .single();

      if (agent && !error) {
        return NextResponse.json({
          ...agent,
          source: 'database',
        });
      }
    } catch (dbError) {
      console.error('Supabase update failed:', dbError);
    }

    // Fallback to mock
    const agent = MOCK_AGENTS.find(a => a.handle === handle);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...agent,
      ...body,
      updatedAt: new Date().toISOString(),
      source: 'mock',
    });

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

    // Try Supabase
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('handle', handle);

      if (!error) {
        return NextResponse.json({ success: true, handle, source: 'database' });
      }
    } catch (dbError) {
      console.error('Supabase delete failed:', dbError);
    }

    // Fallback
    const agent = MOCK_AGENTS.find(a => a.handle === handle);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      handle,
      source: 'mock',
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
