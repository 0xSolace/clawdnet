import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  isRegistryDeployed,
  resolveAgentByDomain,
  resolveAgentByAddress,
  getAgentById,
  getReputationSummary,
  getFeedbackClients,
  formatAgentRegistry,
  parseAgentRegistry,
  buildRegistrationFile,
  DEFAULT_CHAIN_ID,
  type ERC8004Agent,
} from '@/lib/erc8004-onchain';

interface OnChainInfo {
  hasOnChainIdentity: boolean;
  chainId: number;
  registryDeployed: boolean;
  
  // On-chain identity
  identity: {
    tokenId: number | null;
    registry: string | null;
    domain: string | null;
    address: string | null;
    claimedAt: string | null;
  };
  
  // On-chain reputation
  reputation: {
    synced: boolean;
    lastSyncedAt: string | null;
    onChainScore: number | null;
    feedbackCount: number | null;
    clientCount: number | null;
  };
  
  // Registration file
  registrationUrl: string;
}

// GET /api/agents/[handle]/on-chain - Get on-chain identity info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const searchParams = request.nextUrl.searchParams;
    const chainId = parseInt(searchParams.get('chainId') || String(DEFAULT_CHAIN_ID));
    
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    
    // Get agent from database
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.handle, handle))
      .limit(1);
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawdnet.xyz';
    const registryDeployed = isRegistryDeployed(chainId);
    
    // Base response
    const response: OnChainInfo = {
      hasOnChainIdentity: !!(agent.erc8004TokenId && agent.erc8004Registry),
      chainId,
      registryDeployed,
      identity: {
        tokenId: agent.erc8004TokenId ? Number(agent.erc8004TokenId) : null,
        registry: agent.erc8004Registry,
        domain: agent.erc8004Domain,
        address: agent.agentWallet,
        claimedAt: agent.erc8004ClaimedAt?.toISOString() || null,
      },
      reputation: {
        synced: !!agent.erc8004ReputationSyncedAt,
        lastSyncedAt: agent.erc8004ReputationSyncedAt?.toISOString() || null,
        onChainScore: null,
        feedbackCount: null,
        clientCount: null,
      },
      registrationUrl: `${baseUrl}/api/agents/${handle}/registration.json`,
    };
    
    // Fetch live on-chain data if registry is deployed and agent has identity
    if (registryDeployed && agent.erc8004TokenId && agent.erc8004Registry) {
      try {
        // Parse registry to get chain info
        const parsed = parseAgentRegistry(agent.erc8004Registry);
        if (parsed && parsed.chainId === chainId) {
          // Get live on-chain agent info
          const onChainAgent = await getAgentById(BigInt(agent.erc8004TokenId), chainId);
          
          if (onChainAgent) {
            response.identity = {
              ...response.identity,
              domain: onChainAgent.domain,
              address: onChainAgent.address,
            };
            
            // Get reputation data
            const clients = await getFeedbackClients(BigInt(agent.erc8004TokenId), chainId);
            response.reputation.clientCount = clients.length;
            
            if (clients.length > 0) {
              const summary = await getReputationSummary(
                BigInt(agent.erc8004TokenId),
                clients,
                { tag1: 'starred' }, // Filter to rating feedback
                chainId
              );
              
              if (summary) {
                response.reputation.feedbackCount = Number(summary.count);
                // Convert summary value to a 0-100 score
                const decimals = summary.decimals;
                const rawValue = Number(summary.value);
                response.reputation.onChainScore = decimals > 0 
                  ? rawValue / Math.pow(10, decimals)
                  : rawValue;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching on-chain data:', error);
        // Continue with database values
      }
    }
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
    
  } catch (error) {
    console.error('Error getting on-chain info:', error);
    return NextResponse.json(
      { error: 'Failed to get on-chain info' },
      { status: 500 }
    );
  }
}
