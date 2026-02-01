import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
  isRegistryDeployed,
  ratingToERC8004Value,
  hashContent,
  DEFAULT_CHAIN_ID,
} from '@/lib/erc8004-onchain';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'clawdnet-secret-key-change-me');

interface SyncReputationRequest {
  reviewIds?: string[]; // Specific reviews to sync (optional - syncs all unsynced if omitted)
  chainId?: number;
}

// POST /api/agents/[handle]/sync-reputation - Sync reviews to on-chain reputation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body: SyncReputationRequest = await request.json();
    
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('clawdnet-session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let userId: string;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userId = payload.userId as string;
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    
    // Get agent and verify ownership
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.handle, handle))
      .limit(1);
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    if (agent.ownerId !== userId) {
      return NextResponse.json({ error: 'Not authorized to manage this agent' }, { status: 403 });
    }
    
    // Check if agent has on-chain identity
    if (!agent.erc8004TokenId || !agent.erc8004Registry) {
      return NextResponse.json({
        error: 'Agent does not have on-chain identity',
        message: 'Claim on-chain identity first before syncing reputation',
      }, { status: 400 });
    }
    
    const chainId = body.chainId || DEFAULT_CHAIN_ID;
    
    // Check if registry is deployed
    if (!isRegistryDeployed(chainId)) {
      return NextResponse.json({
        error: 'Reputation registry not deployed on this chain',
        chainId,
      }, { status: 400 });
    }
    
    // Get reviews to sync
    const reviews = await db
      .select({
        review: schema.reviews,
        user: {
          handle: schema.users.handle,
          walletAddress: schema.users.walletAddress,
        },
      })
      .from(schema.reviews)
      .leftJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
      .where(eq(schema.reviews.agentId, agent.id));
    
    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reviews to sync',
        synced: 0,
      });
    }
    
    // Check which reviews are already synced
    const syncedReviews = await db
      .select()
      .from(schema.erc8004FeedbackSync)
      .where(eq(schema.erc8004FeedbackSync.agentId, agent.id));
    
    const syncedReviewIds = new Set(syncedReviews.map(s => s.reviewId));
    
    // Filter to unsynced reviews (or specific reviews if provided)
    const reviewsToSync = reviews.filter(r => {
      if (body.reviewIds && !body.reviewIds.includes(r.review.id)) {
        return false;
      }
      return !syncedReviewIds.has(r.review.id);
    });
    
    if (reviewsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All reviews already synced',
        synced: 0,
        totalSynced: syncedReviews.length,
      });
    }
    
    // Prepare feedback data for on-chain submission
    // Note: Actual on-chain submission requires user signatures
    // This endpoint prepares the data and returns it for client-side submission
    const feedbackData = reviewsToSync.map(r => {
      const { value, decimals } = ratingToERC8004Value(r.review.rating);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawdnet.xyz';
      
      return {
        reviewId: r.review.id,
        agentId: Number(agent.erc8004TokenId),
        value: Number(value),
        valueDecimals: decimals,
        tag1: 'starred',
        tag2: 'clawdnet',
        endpoint: `${baseUrl}/api/agents/${handle}/reviews`,
        feedbackURI: `${baseUrl}/api/agents/${handle}/reviews/${r.review.id}`,
        feedbackHash: r.review.content 
          ? hashContent(JSON.stringify({
              rating: r.review.rating,
              content: r.review.content,
              timestamp: r.review.createdAt.toISOString(),
            }))
          : null,
        reviewer: {
          handle: r.user?.handle,
          wallet: r.user?.walletAddress,
        },
        rating: r.review.rating,
        content: r.review.content,
        createdAt: r.review.createdAt.toISOString(),
      };
    });
    
    // Return data for client-side submission
    // Each feedback requires the reviewer's wallet to sign
    return NextResponse.json({
      success: true,
      status: 'ready_to_submit',
      message: 'Reviews prepared for on-chain submission. Each review requires the reviewer\'s wallet signature.',
      agentId: Number(agent.erc8004TokenId),
      chainId,
      reviewsToSync: feedbackData.length,
      totalReviews: reviews.length,
      alreadySynced: syncedReviews.length,
      feedback: feedbackData,
      instructions: {
        step1: 'For each review, the reviewer must connect their wallet',
        step2: 'Call giveFeedback() on the Reputation Registry contract',
        step3: 'After transaction confirms, call POST /api/agents/[handle]/sync-reputation/confirm with the txHash',
      },
    });
    
  } catch (error) {
    console.error('Error in sync-reputation:', error);
    return NextResponse.json(
      { error: 'Failed to prepare reputation sync' },
      { status: 500 }
    );
  }
}

// GET /api/agents/[handle]/sync-reputation - Get sync status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    
    // Get agent
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.handle, handle))
      .limit(1);
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Get review count
    const reviews = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.agentId, agent.id));
    
    // Get synced count
    const syncedReviews = await db
      .select()
      .from(schema.erc8004FeedbackSync)
      .where(eq(schema.erc8004FeedbackSync.agentId, agent.id));
    
    return NextResponse.json({
      handle,
      hasOnChainIdentity: !!(agent.erc8004TokenId && agent.erc8004Registry),
      totalReviews: reviews.length,
      syncedReviews: syncedReviews.length,
      unsyncedReviews: reviews.length - syncedReviews.length,
      lastSyncedAt: agent.erc8004ReputationSyncedAt?.toISOString() || null,
      lastSyncTxHash: agent.erc8004ReputationTxHash || null,
      recentSync: syncedReviews.slice(0, 5).map(s => ({
        reviewId: s.reviewId,
        feedbackIndex: Number(s.feedbackIndex),
        txHash: s.txHash,
        syncedAt: s.syncedAt.toISOString(),
      })),
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
