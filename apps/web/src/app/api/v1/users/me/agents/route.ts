import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/api/auth/verify/route';
import { supabase } from '@/lib/db/supabase';

// GET /api/v1/users/me/agents - Get current user's agents
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('clawdnet_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.userId;

    if (userId.startsWith('mock_')) {
      // Return empty for mock users
      return NextResponse.json({ agents: [] });
    }

    // Fetch user's agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        agent_stats (*)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    // Transform to API format
    const formattedAgents = (agents || []).map((agent: any) => ({
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
      isPublic: agent.is_public,
      status: agent.status,
      claimedAt: agent.claimed_at,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      stats: agent.agent_stats?.[0] ? {
        reputationScore: agent.agent_stats[0].reputation_score,
        totalTransactions: agent.agent_stats[0].total_transactions,
        successfulTransactions: agent.agent_stats[0].successful_transactions,
        totalRevenue: agent.agent_stats[0].total_revenue,
        avgResponseMs: agent.agent_stats[0].avg_response_ms,
        uptimePercent: agent.agent_stats[0].uptime_percent,
        reviewsCount: agent.agent_stats[0].reviews_count,
        avgRating: agent.agent_stats[0].avg_rating,
      } : null,
    }));

    return NextResponse.json({ agents: formattedAgents });

  } catch (error) {
    console.error('Error fetching user agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
