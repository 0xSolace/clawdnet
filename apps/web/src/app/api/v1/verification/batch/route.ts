import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { runVerification, type VerificationLevel } from '@/lib/identity';

/**
 * POST /api/v1/verification/batch - Batch verify multiple agents
 * 
 * Requires admin API key
 * 
 * Body:
 * - handles?: string[] - Specific handles to verify (optional, verifies all if not provided)
 * - limit?: number - Max agents to verify (default 50, max 100)
 * - filter?: 'stale' | 'unverified' | 'all' - Which agents to verify
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }
    
    const { data: key } = await supabase
      .from('api_keys')
      .select('id, permissions')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
    
    if (!key?.permissions?.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }
    
    // Parse body
    const body = await request.json().catch(() => ({}));
    const handles = body.handles as string[] | undefined;
    const limit = Math.min(body.limit || 50, 100);
    const filter = body.filter || 'stale';
    
    // Build query for agents to verify
    let query = supabase
      .from('agents')
      .select(`
        id, handle, name, endpoint, protocols, is_verified, owner_id,
        verification_level, last_verified_at, created_at,
        agent_stats (
          total_transactions,
          avg_rating,
          uptime_percent
        )
      `)
      .eq('is_public', true);
    
    if (handles && handles.length > 0) {
      // Verify specific handles
      query = query.in('handle', handles.map(h => h.toLowerCase()));
    } else {
      // Filter based on verification state
      if (filter === 'stale') {
        // Agents that haven't been checked in 24+ hours
        const staleDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.or(`last_verified_at.is.null,last_verified_at.lt.${staleDate}`);
      } else if (filter === 'unverified') {
        query = query.eq('is_verified', false);
      }
      // 'all' - no additional filter
    }
    
    query = query.limit(limit);
    
    const { data: agents, error: agentError } = await query;
    
    if (agentError) {
      console.error('Error fetching agents:', agentError);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }
    
    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No agents to verify',
        verified: 0,
        results: [],
      });
    }
    
    // Run verification for each agent
    const results: {
      handle: string;
      name: string;
      previousLevel: VerificationLevel;
      newLevel: VerificationLevel;
      passed: boolean;
      score: number;
      error?: string;
    }[] = [];
    
    let successCount = 0;
    let failCount = 0;
    
    for (const agent of agents) {
      try {
        const stats = (agent as any).agent_stats?.[0] || {};
        const previousLevel = (agent.verification_level || 'none') as VerificationLevel;
        
        // Check owner verification
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
        
        // Extract check details
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
        
        // Update agent
        await supabase
          .from('agents')
          .update({
            is_verified: result.level !== 'none',
            verification_level: result.level,
            last_verified_at: result.checkedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);
        
        results.push({
          handle: agent.handle,
          name: agent.name,
          previousLevel,
          newLevel: result.level,
          passed: result.passed,
          score: result.score,
        });
        
        successCount++;
        
      } catch (err: any) {
        failCount++;
        results.push({
          handle: agent.handle,
          name: agent.name,
          previousLevel: (agent.verification_level || 'none') as VerificationLevel,
          newLevel: 'none',
          passed: false,
          score: 0,
          error: err.message,
        });
      }
      
      // Add small delay to avoid overwhelming endpoints
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return NextResponse.json({
      success: true,
      verified: successCount,
      failed: failCount,
      total: agents.length,
      results,
    });
    
  } catch (error) {
    console.error('Batch verification error:', error);
    return NextResponse.json(
      { error: 'Batch verification failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/verification/batch - Get batch verification status
 * 
 * Returns summary of verification states across all agents
 */
export async function GET(request: NextRequest) {
  try {
    // Get counts by verification level
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, verification_level, is_verified, last_verified_at')
      .eq('is_public', true);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }
    
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    const summary = {
      total: agents?.length || 0,
      byLevel: {
        none: 0,
        basic: 0,
        verified: 0,
        trusted: 0,
      },
      stale: 0, // Not checked in 24h
      neverChecked: 0,
    };
    
    for (const agent of agents || []) {
      const level = (agent.verification_level || 'none') as VerificationLevel;
      summary.byLevel[level]++;
      
      if (!agent.last_verified_at) {
        summary.neverChecked++;
        summary.stale++;
      } else {
        const lastCheck = new Date(agent.last_verified_at).getTime();
        if (now - lastCheck > staleThreshold) {
          summary.stale++;
        }
      }
    }
    
    return NextResponse.json({
      summary,
      message: `${summary.stale} agents need verification`,
    });
    
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
