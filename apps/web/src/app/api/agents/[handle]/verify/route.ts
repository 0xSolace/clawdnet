import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { cookies } from 'next/headers';
import { 
  runVerification, 
  calculateVerificationLevel,
  type VerificationLevel,
  type VerificationResult,
} from '@/lib/identity';

/**
 * POST /api/agents/[handle]/verify - Run verification checks for an agent
 * 
 * Can be triggered by:
 * - Agent owner (authenticated)
 * - System/admin (with API key)
 * - Anyone (but results won't be saved without auth)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  
  try {
    // Get agent with stats
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        id, handle, name, endpoint, protocols, is_verified, owner_id, 
        verification_level, created_at,
        agent_stats (
          total_transactions,
          avg_rating,
          uptime_percent,
          reputation_score
        )
      `)
      .eq('handle', handle.toLowerCase())
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user is owner (for saving results)
    let isOwner = false;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('clawdnet_session');
    
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.userId) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.userId)
            .single();
          
          if (user && user.id === agent.owner_id) {
            isOwner = true;
          }
        }
      } catch {
        // Invalid session, continue as non-owner
      }
    }
    
    // Check for API key auth (for batch operations)
    const apiKey = request.headers.get('x-api-key');
    let isAdmin = false;
    if (apiKey) {
      const { data: key } = await supabase
        .from('api_keys')
        .select('id, permissions')
        .eq('key', apiKey)
        .eq('is_active', true)
        .single();
      
      if (key?.permissions?.includes('admin')) {
        isAdmin = true;
      }
    }
    
    // Get user owner verified status
    let ownerVerified = false;
    if (agent.owner_id) {
      const { data: owner } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('id', agent.owner_id)
        .single();
      
      ownerVerified = !!owner?.wallet_address;
    }
    
    // Run verification
    const stats = (agent as any).agent_stats?.[0] || {};
    const result = await runVerification({
      id: agent.id,
      handle: agent.handle,
      name: agent.name,
      endpoint: agent.endpoint,
      protocols: agent.protocols || [],
      isVerified: agent.is_verified,
      ownerVerified,
      stats: {
        totalTransactions: stats.total_transactions,
        avgRating: stats.avg_rating,
        uptimePercent: stats.uptime_percent,
      },
      createdAt: agent.created_at,
    });
    
    // Save results if owner or admin
    if (isOwner || isAdmin) {
      // Find check results
      const endpointCheck = result.checks.find(c => c.name === 'Endpoint Health');
      const a2aCheck = result.checks.find(c => c.name === 'A2A Protocol');
      const erc8004Check = result.checks.find(c => c.name === 'ERC-8004 Registration');
      
      // Store verification record
      await supabase.from('agent_verifications').insert({
        agent_id: agent.id,
        verification_level: result.level,
        endpoint_reachable: endpointCheck?.status === 'pass',
        endpoint_response_ms: (endpointCheck?.details as any)?.responseTime,
        endpoint_status_code: (endpointCheck?.details as any)?.statusCode,
        a2a_protocol_supported: a2aCheck?.status === 'pass',
        a2a_version: (a2aCheck?.details as any)?.version,
        erc8004_supported: erc8004Check?.status === 'pass',
        erc8004_services: (erc8004Check?.details as any)?.services,
        owner_verified: ownerVerified,
        passed: result.passed,
        score: result.score,
        checked_at: result.checkedAt,
        next_check_at: result.nextCheckAt,
      });
      
      // Update agent verification status
      await supabase
        .from('agents')
        .update({
          is_verified: result.level !== 'none',
          verification_level: result.level,
          last_verified_at: result.checkedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id);
    }
    
    return NextResponse.json({
      success: true,
      verification: result,
      agent: {
        handle: agent.handle,
        name: agent.name,
        isVerified: result.level !== 'none',
        verificationLevel: result.level,
      },
      saved: isOwner || isAdmin,
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/[handle]/verify - Get current verification status and history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  
  try {
    // Get agent with stats and latest verification
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id, handle, name, is_verified, endpoint, protocols, owner_id,
        verification_level, last_verified_at, created_at,
        agent_stats (
          reputation_score,
          total_transactions,
          successful_transactions,
          avg_rating,
          uptime_percent
        )
      `)
      .eq('handle', handle.toLowerCase())
      .single();
    
    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Get latest verification result
    const { data: latestVerification } = await supabase
      .from('agent_verifications')
      .select('*')
      .eq('agent_id', agent.id)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();
    
    // Get verification history (last 10)
    const { data: history } = await supabase
      .from('agent_verifications')
      .select('id, verification_level, passed, score, checked_at')
      .eq('agent_id', agent.id)
      .order('checked_at', { ascending: false })
      .limit(10);
    
    // Check if user is owner
    let isOwner = false;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('clawdnet_session');
    
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.userId && session.userId === agent.owner_id) {
          isOwner = true;
        }
      } catch {
        // Invalid session
      }
    }
    
    // Calculate current level
    const stats = (agent as any).agent_stats?.[0] || {};
    const level = calculateVerificationLevel({
      isVerified: agent.is_verified,
      verificationLevel: agent.verification_level as VerificationLevel,
      protocols: agent.protocols || [],
      stats: {
        totalTransactions: stats.total_transactions,
        avgRating: stats.avg_rating,
        uptimePercent: stats.uptime_percent,
      },
      createdAt: agent.created_at,
    });
    
    // Build response
    const response: any = {
      handle: agent.handle,
      name: agent.name,
      isVerified: agent.is_verified,
      verificationLevel: level,
      endpoint: agent.endpoint,
      protocols: agent.protocols || [],
      lastCheckedAt: agent.last_verified_at || latestVerification?.checked_at,
      nextCheckAt: latestVerification?.next_check_at,
      canRequestVerification: isOwner,
      isOwner,
    };
    
    // Include latest check details
    if (latestVerification) {
      response.latestCheck = {
        passed: latestVerification.passed,
        score: latestVerification.score,
        checkedAt: latestVerification.checked_at,
        checks: {
          endpointReachable: latestVerification.endpoint_reachable,
          endpointResponseMs: latestVerification.endpoint_response_ms,
          a2aSupported: latestVerification.a2a_protocol_supported,
          a2aVersion: latestVerification.a2a_version,
          erc8004Supported: latestVerification.erc8004_supported,
          ownerVerified: latestVerification.owner_verified,
        },
      };
    }
    
    // Include history for owners
    if (isOwner && history) {
      response.history = history;
    }
    
    // Calculate upgrade requirements
    const upgradeBlockers = getUpgradeBlockers(level, {
      stats,
      protocols: agent.protocols,
      createdAt: agent.created_at,
      ownerVerified: latestVerification?.owner_verified,
      a2aSupported: latestVerification?.a2a_protocol_supported,
    });
    
    if (upgradeBlockers.length > 0) {
      response.upgradeBlockers = upgradeBlockers;
      response.eligibleForUpgrade = getNextLevel(level);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}

/**
 * Get what's blocking upgrade to next level
 */
function getUpgradeBlockers(
  currentLevel: VerificationLevel,
  data: {
    stats: any;
    protocols?: string[];
    createdAt?: string;
    ownerVerified?: boolean;
    a2aSupported?: boolean;
  }
): string[] {
  const blockers: string[] = [];
  const { stats, protocols, createdAt, ownerVerified, a2aSupported } = data;
  
  if (currentLevel === 'none') {
    blockers.push('Run verification to check endpoint health');
    return blockers;
  }
  
  if (currentLevel === 'basic') {
    if (!a2aSupported && (!protocols || protocols.length === 0)) {
      blockers.push('Add A2A protocol support (/.well-known/agent.json)');
    }
    if (!ownerVerified) {
      blockers.push('Verify owner identity with wallet signature');
    }
    return blockers;
  }
  
  if (currentLevel === 'verified') {
    const transactions = stats?.total_transactions || 0;
    const rating = Number(stats?.avg_rating) || 0;
    const uptime = Number(stats?.uptime_percent) || 0;
    const age = createdAt ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
    
    if (transactions < 30) blockers.push(`Complete ${30 - transactions} more transactions`);
    if (rating < 4.5) blockers.push(`Improve rating to 4.5+ (current: ${rating.toFixed(1)})`);
    if (uptime < 95) blockers.push(`Improve uptime to 95%+ (current: ${uptime.toFixed(0)}%)`);
    if (age < 30) blockers.push(`${Math.ceil(30 - age)} more days until trusted eligible`);
  }
  
  return blockers;
}

/**
 * Get next verification level
 */
function getNextLevel(current: VerificationLevel): VerificationLevel | undefined {
  switch (current) {
    case 'none': return 'basic';
    case 'basic': return 'verified';
    case 'verified': return 'trusted';
    default: return undefined;
  }
}
