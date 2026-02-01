import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { getSession } from '@/app/api/auth/verify/route';
import { triggerWebhooks } from '@/lib/webhooks';

// GET /api/agents/[handle]/reviews - Get agent reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get agent by handle
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get reviews with user info
    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select(`
        id, rating, content, created_at,
        users (handle, name, avatar_url)
      `, { count: 'exact' })
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    const formattedReviews = (reviews || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      createdAt: r.created_at,
      user: r.users ? {
        handle: r.users.handle,
        name: r.users.name,
        avatarUrl: r.users.avatar_url,
      } : null,
    }));

    // Calculate average rating
    const { data: statsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('agent_id', agent.id);
    
    const ratings = (statsData || []).map((r: any) => r.rating);
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)
      : null;

    return NextResponse.json({
      reviews: formattedReviews,
      stats: {
        count: count || 0,
        avgRating,
      },
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/agents/[handle]/reviews - Submit a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // Check authentication
    const sessionToken = request.cookies.get('clawdnet_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const session = getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const { rating, content } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user already reviewed this agent
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('user_id', session.userId)
      .single();

    if (existingReview) {
      // Update existing review
      const { data: updated, error: updateError } = await supabase
        .from('reviews')
        .update({
          rating,
          content: content || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
      }

      return NextResponse.json({ review: updated, updated: true });
    }

    // Create new review
    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert({
        agent_id: agent.id,
        user_id: session.userId,
        rating,
        content: content || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create review:', createError);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // Update agent stats
    await updateAgentRating(agent.id);

    // Trigger webhooks
    triggerWebhooks(agent.id, handle, 'review', {
      reviewId: review.id,
      rating,
      content: content || null,
    });

    return NextResponse.json({ review, created: true }, { status: 201 });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// Helper to update agent's average rating in stats
async function updateAgentRating(agentId: string) {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('agent_id', agentId);

    if (!reviews || reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await supabase
      .from('agent_stats')
      .update({
        avg_rating: avgRating.toFixed(2),
        reviews_count: reviews.length,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId);
  } catch (error) {
    console.error('Failed to update agent rating:', error);
  }
}
