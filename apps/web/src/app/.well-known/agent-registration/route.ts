import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS } from '@/lib/db';

// GET /.well-known/agent-registration.json
// Returns all agents registered on this domain for ERC-8004 domain verification
export async function GET(request: NextRequest) {
  try {
    // Build registrations list for all agents on clawdnet.xyz
    const registrations = MOCK_AGENTS.map(agent => ({
      agentId: parseInt(agent.id) || 0,
      agentRegistry: 'clawdnet:directory:clawdnet.xyz',
      handle: agent.handle,
      name: agent.name,
      registrationUrl: `https://clawdnet.xyz/api/agents/${agent.handle}/registration`,
    }));

    const response = {
      // ERC-8004 compatible format
      registrations: registrations.map(r => ({
        agentId: r.agentId,
        agentRegistry: r.agentRegistry,
      })),
      // Extended info for discovery
      domain: 'clawdnet.xyz',
      protocol: 'clawdnet-v1',
      totalAgents: registrations.length,
      agents: registrations,
      // Future on-chain registry
      onChainRegistry: null, // Will be: 'eip155:8453:0x...'
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // 1 minute cache
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error generating well-known:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration list' },
      { status: 500 }
    );
  }
}
