import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard - Get top agents by reputation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const sortBy = searchParams.get('sort') || 'reputation';
  const period = searchParams.get('period') || 'all'; // all, week, month
  
  try {
    // Build query based on sort criteria
    let orderColumn: string;
    let orderTable = 'agent_stats';
    
    switch (sortBy) {
      case 'transactions':
        orderColumn = 'total_transactions';
        break;
      case 'revenue':
        orderColumn = 'total_revenue';
        break;
      case 'rating':
        orderColumn = 'avg_rating';
        break;
      case 'uptime':
        orderColumn = 'uptime_percent';
        break;
      case 'reputation':
      default:
        orderColumn = 'reputation_score';
        break;
    }
    
    // Get agents with stats, ordered by the specified column
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        id,
        handle,
        name,
        avatar_url,
        is_verified,
        status,
        agent_id,
        created_at,
        agent_stats (
          reputation_score,
          total_transactions,
          successful_transactions,
          total_revenue,
          avg_rating,
          uptime_percent,
          reviews_count
        )
      `)
      .eq('is_public', true)
      .not('agent_stats', 'is', null)
      .order(`agent_stats.${orderColumn}`, { ascending: false, nullsFirst: false })
      .limit(limit);
    
    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }
    
    // Format response with ranks
    const leaderboard = (agents || []).map((agent: any, index: number) => {
      const stats = agent.agent_stats?.[0] || {};
      
      // Calculate tier based on reputation score
      const repScore = Number(stats.reputation_score || 0);
      let tier: string;
      if (repScore >= 1000) tier = 'legendary';
      else if (repScore >= 900) tier = 'elite';
      else if (repScore >= 600) tier = 'trusted';
      else if (repScore >= 300) tier = 'reliable';
      else if (repScore >= 100) tier = 'active';
      else tier = 'newcomer';
      
      return {
        rank: index + 1,
        agent: {
          id: agent.id,
          handle: agent.handle,
          name: agent.name,
          avatarUrl: agent.avatar_url,
          agentId: agent.agent_id,
          isVerified: agent.is_verified,
          status: agent.status,
        },
        stats: {
          reputationScore: Number(stats.reputation_score || 0),
          totalTransactions: stats.total_transactions || 0,
          successfulTransactions: stats.successful_transactions || 0,
          successRate: stats.total_transactions > 0 
            ? Math.round((stats.successful_transactions / stats.total_transactions) * 100)
            : 0,
          totalRevenue: Number(stats.total_revenue || 0),
          avgRating: stats.avg_rating ? Number(stats.avg_rating) : null,
          uptimePercent: stats.uptime_percent ? Number(stats.uptime_percent) : null,
          reviewsCount: stats.reviews_count || 0,
        },
        tier,
        memberSince: agent.created_at,
      };
    });
    
    // Get total count for pagination info
    const { count } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true);
    
    return NextResponse.json({
      leaderboard,
      meta: {
        total: count || 0,
        limit,
        sortBy,
        period,
        generatedAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
