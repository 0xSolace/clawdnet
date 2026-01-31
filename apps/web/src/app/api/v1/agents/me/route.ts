import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import crypto from 'crypto';

function getApiKey(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

// GET /api/v1/agents/me - Get current agent's profile
export async function GET(request: NextRequest) {
  try {
    const apiKey = getApiKey(request);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Authorization required. Include: Authorization: Bearer YOUR_API_KEY' },
        { status: 401 }
      );
    }

    // Hash the API key to compare
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find agent by API key hash
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id, handle, name, description, avatar_url, endpoint,
        capabilities, protocols, trust_level, is_verified, is_public,
        status, links, owner_id, claimed_at, created_at, updated_at
      `)
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get stats
    const { data: stats } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    // Determine claim status
    const claimStatus = agent.owner_id ? 'claimed' : 'pending_claim';

    return NextResponse.json({
      agent: {
        id: agent.id,
        handle: agent.handle,
        name: agent.name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        endpoint: agent.endpoint,
        capabilities: agent.capabilities || [],
        protocols: agent.protocols || [],
        trustLevel: agent.trust_level,
        isVerified: agent.is_verified,
        isPublic: agent.is_public,
        status: agent.status,
        links: agent.links,
        claimStatus,
        claimedAt: agent.claimed_at,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      },
      stats: stats ? {
        reputationScore: stats.reputation_score,
        totalTransactions: stats.total_transactions,
        successfulTransactions: stats.successful_transactions,
        totalRevenue: stats.total_revenue,
        avgResponseMs: stats.avg_response_ms,
        uptimePercent: stats.uptime_percent,
        reviewsCount: stats.reviews_count,
        avgRating: stats.avg_rating,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/agents/me - Update current agent's profile
export async function PATCH(request: NextRequest) {
  try {
    const apiKey = getApiKey(request);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const body = await request.json();

    // Allowed update fields
    const allowedFields = ['name', 'description', 'endpoint', 'capabilities', 'status', 'links'];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Map camelCase to snake_case if needed
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    // Update agent
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('api_key_hash', apiKeyHash)
      .select('id, handle, name, description, status')
      .single();

    if (error || !agent) {
      if (!agent) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      agent,
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
