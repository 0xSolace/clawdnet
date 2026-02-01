import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// Verification check timeout
const TIMEOUT_MS = 10000;

interface VerificationResult {
  passed: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'skip';
    message: string;
    details?: Record<string, unknown>;
  }[];
  score: number;
  level: 'none' | 'basic' | 'verified';
}

/**
 * Check if endpoint is reachable and returns valid response
 */
async function checkEndpoint(endpoint: string): Promise<{
  reachable: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ClawdNet-Verifier/1.0',
      },
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    
    return {
      reachable: true,
      responseTime,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      reachable: false,
      responseTime: Date.now() - start,
      error: error.name === 'AbortError' ? 'Request timeout' : error.message,
    };
  }
}

/**
 * Check if endpoint supports A2A protocol
 */
async function checkA2AProtocol(endpoint: string): Promise<{
  supported: boolean;
  version?: string;
  error?: string;
}> {
  try {
    // Try common A2A discovery endpoints
    const discoveryUrls = [
      `${endpoint}/.well-known/agent.json`,
      `${endpoint}/agent.json`,
      endpoint,
    ];
    
    for (const url of discoveryUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS / 2);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ClawdNet-Verifier/1.0',
          },
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data && (data.name || data.agentId || data.capabilities)) {
            return {
              supported: true,
              version: data.version || '1.0',
            };
          }
        }
      } catch {
        continue;
      }
    }
    
    return { supported: false };
  } catch (error: any) {
    return { supported: false, error: error.message };
  }
}

/**
 * Check if endpoint supports ERC-8004
 */
async function checkERC8004(endpoint: string): Promise<{
  supported: boolean;
  services?: string[];
  error?: string;
}> {
  try {
    const registrationUrl = `${endpoint}/.well-known/agent-registration`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS / 2);
    
    const response = await fetch(registrationUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ClawdNet-Verifier/1.0',
      },
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && data.services) {
        return {
          supported: true,
          services: data.services.map((s: any) => s.name || s.type),
        };
      }
    }
    
    return { supported: false };
  } catch (error: any) {
    return { supported: false, error: error.message };
  }
}

/**
 * POST /api/agents/[handle]/verify - Request verification for an agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  
  try {
    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, handle, name, endpoint, protocols, is_verified, owner_id')
      .eq('handle', handle.toLowerCase())
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Run verification checks
    const checks: VerificationResult['checks'] = [];
    let score = 0;
    
    // Check 1: Endpoint reachable
    const endpointCheck = await checkEndpoint(agent.endpoint);
    checks.push({
      name: 'Endpoint Reachable',
      status: endpointCheck.reachable ? 'pass' : 'fail',
      message: endpointCheck.reachable 
        ? `Endpoint responded in ${endpointCheck.responseTime}ms (HTTP ${endpointCheck.statusCode})`
        : `Failed to reach endpoint: ${endpointCheck.error}`,
      details: endpointCheck,
    });
    if (endpointCheck.reachable) score += 30;
    
    // Check 2: A2A Protocol Support
    const a2aCheck = await checkA2AProtocol(agent.endpoint);
    checks.push({
      name: 'A2A Protocol',
      status: a2aCheck.supported ? 'pass' : 'skip',
      message: a2aCheck.supported
        ? `A2A protocol detected (v${a2aCheck.version})`
        : 'A2A protocol not detected (optional)',
      details: a2aCheck,
    });
    if (a2aCheck.supported) score += 20;
    
    // Check 3: ERC-8004 Support
    const erc8004Check = await checkERC8004(agent.endpoint);
    checks.push({
      name: 'ERC-8004 Registration',
      status: erc8004Check.supported ? 'pass' : 'skip',
      message: erc8004Check.supported
        ? `ERC-8004 services: ${erc8004Check.services?.join(', ')}`
        : 'ERC-8004 registration not found (optional)',
      details: erc8004Check,
    });
    if (erc8004Check.supported) score += 20;
    
    // Check 4: Response time
    if (endpointCheck.reachable && endpointCheck.responseTime) {
      const isfast = endpointCheck.responseTime < 1000;
      checks.push({
        name: 'Response Time',
        status: isfast ? 'pass' : 'skip',
        message: isfast
          ? `Fast response time (${endpointCheck.responseTime}ms)`
          : `Response time is ${endpointCheck.responseTime}ms (consider optimizing)`,
      });
      if (isfast) score += 10;
    }
    
    // Check 5: Protocols declared
    const hasProtocols = agent.protocols && agent.protocols.length > 0;
    checks.push({
      name: 'Protocols Declared',
      status: hasProtocols ? 'pass' : 'skip',
      message: hasProtocols
        ? `Supports: ${agent.protocols.join(', ')}`
        : 'No protocols declared',
    });
    if (hasProtocols) score += 20;
    
    // Determine verification level
    const passed = endpointCheck.reachable;
    let level: VerificationResult['level'] = 'none';
    
    if (score >= 50) {
      level = 'verified';
    } else if (passed) {
      level = 'basic';
    }
    
    // Update agent if verification passed
    if (passed && !agent.is_verified) {
      await supabase
        .from('agents')
        .update({
          is_verified: level !== 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id);
      
      // Update stats with last verification time
      await supabase
        .from('agent_stats')
        .upsert({
          agent_id: agent.id,
          updated_at: new Date().toISOString(),
        });
    }
    
    const result: VerificationResult = {
      passed,
      checks,
      score,
      level,
    };
    
    return NextResponse.json({
      success: true,
      verification: result,
      agent: {
        handle: agent.handle,
        name: agent.name,
        isVerified: level !== 'none',
        verificationLevel: level,
      },
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
 * GET /api/agents/[handle]/verify - Get current verification status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  
  try {
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id, handle, name, is_verified, endpoint, protocols,
        agent_stats (
          reputation_score,
          total_transactions,
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
    
    // Calculate verification level based on current data
    const stats = (agent as any).agent_stats?.[0] || {};
    let level: VerificationResult['level'] = 'none';
    
    if (agent.is_verified) {
      const hasGoodStats = 
        Number(stats.total_transactions || 0) >= 10 &&
        Number(stats.avg_rating || 0) >= 4.0;
      level = hasGoodStats ? 'verified' : 'basic';
    }
    
    return NextResponse.json({
      handle: agent.handle,
      name: agent.name,
      isVerified: agent.is_verified,
      verificationLevel: level,
      endpoint: agent.endpoint,
      protocols: agent.protocols || [],
      canRequestVerification: !agent.is_verified,
    });
    
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
