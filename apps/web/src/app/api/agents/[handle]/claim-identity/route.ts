import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
  isRegistryDeployed,
  resolveAgentByDomain,
  formatAgentRegistry,
  DEFAULT_CHAIN_ID,
  DEFAULT_TESTNET_CHAIN_ID,
} from '@/lib/erc8004-onchain';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'clawdnet-secret-key-change-me');

interface ClaimIdentityRequest {
  domain?: string; // Custom domain, defaults to {handle}.clawdnet.xyz
  walletAddress: string;
  chainId?: number; // Defaults to Base mainnet
  txHash?: string; // If already claimed, provide tx hash for verification
  tokenId?: number; // If already claimed, provide on-chain tokenId
}

// POST /api/agents/[handle]/claim-identity - Claim or link on-chain identity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body: ClaimIdentityRequest = await request.json();
    
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
    
    // Validate wallet address
    if (!body.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }
    
    // Check if agent already has on-chain identity
    if (agent.erc8004TokenId && agent.erc8004Registry) {
      return NextResponse.json({
        error: 'Agent already has on-chain identity',
        existing: {
          tokenId: agent.erc8004TokenId,
          registry: agent.erc8004Registry,
          domain: agent.erc8004Domain,
        },
      }, { status: 409 });
    }
    
    const chainId = body.chainId || DEFAULT_CHAIN_ID;
    const domain = body.domain || `${handle}.clawdnet.xyz`;
    
    // Check if registry is deployed
    if (!isRegistryDeployed(chainId)) {
      // Registry not deployed yet - return info for client-side deployment
      return NextResponse.json({
        status: 'registry_not_deployed',
        message: 'ERC-8004 registry not yet deployed on this chain. Use testnet or wait for mainnet deployment.',
        chainId,
        suggestedChainId: isRegistryDeployed(DEFAULT_TESTNET_CHAIN_ID) ? DEFAULT_TESTNET_CHAIN_ID : null,
        domain,
        walletAddress: body.walletAddress,
      });
    }
    
    // If txHash and tokenId provided, this is a link request (already claimed)
    if (body.txHash && body.tokenId) {
      // Verify the on-chain registration matches
      const onChainAgent = await resolveAgentByDomain(domain, chainId);
      
      if (!onChainAgent) {
        return NextResponse.json({
          error: 'On-chain registration not found for this domain',
        }, { status: 400 });
      }
      
      if (onChainAgent.address.toLowerCase() !== body.walletAddress.toLowerCase()) {
        return NextResponse.json({
          error: 'Wallet address does not match on-chain registration',
        }, { status: 400 });
      }
      
      // Update agent with on-chain identity
      const registry = formatAgentRegistry(chainId, body.walletAddress as `0x${string}`);
      
      await db
        .update(schema.agents)
        .set({
          erc8004TokenId: BigInt(body.tokenId),
          erc8004Registry: registry,
          erc8004Domain: domain,
          erc8004ClaimedAt: new Date(),
          agentWallet: body.walletAddress,
          updatedAt: new Date(),
        })
        .where(eq(schema.agents.id, agent.id));
      
      return NextResponse.json({
        success: true,
        tokenId: body.tokenId,
        registry,
        domain,
        txHash: body.txHash,
        linked: true,
      });
    }
    
    // Otherwise, return the info needed to claim on-chain
    // The actual on-chain transaction should be done by the user's wallet
    const existingOnChain = await resolveAgentByDomain(domain, chainId);
    
    if (existingOnChain) {
      return NextResponse.json({
        error: 'Domain already registered on-chain',
        existingOwner: existingOnChain.address,
      }, { status: 409 });
    }
    
    // Return registration parameters for client to submit transaction
    return NextResponse.json({
      status: 'ready_to_claim',
      chainId,
      domain,
      walletAddress: body.walletAddress,
      // Client should call newAgent(domain, walletAddress) on the registry contract
      contractCall: {
        function: 'newAgent',
        args: [domain, body.walletAddress],
        description: 'Call this function on the Identity Registry to claim your on-chain identity',
      },
    });
    
  } catch (error) {
    console.error('Error in claim-identity:', error);
    return NextResponse.json(
      { error: 'Failed to process identity claim' },
      { status: 500 }
    );
  }
}

// GET /api/agents/[handle]/claim-identity - Check identity claim status
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
    
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.handle, handle))
      .limit(1);
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Check on-chain status
    const domain = agent.erc8004Domain || `${handle}.clawdnet.xyz`;
    const chainId = DEFAULT_CHAIN_ID;
    
    let onChainAgent = null;
    if (isRegistryDeployed(chainId)) {
      onChainAgent = await resolveAgentByDomain(domain, chainId);
    }
    
    return NextResponse.json({
      handle,
      hasOnChainIdentity: !!(agent.erc8004TokenId && agent.erc8004Registry),
      claimed: {
        tokenId: agent.erc8004TokenId ? Number(agent.erc8004TokenId) : null,
        registry: agent.erc8004Registry,
        domain: agent.erc8004Domain,
        claimedAt: agent.erc8004ClaimedAt?.toISOString() || null,
        wallet: agent.agentWallet,
      },
      onChain: onChainAgent ? {
        agentId: Number(onChainAgent.agentId),
        domain: onChainAgent.domain,
        address: onChainAgent.address,
      } : null,
      registryDeployed: isRegistryDeployed(chainId),
      suggestedDomain: domain,
      chainId,
    });
    
  } catch (error) {
    console.error('Error checking identity status:', error);
    return NextResponse.json(
      { error: 'Failed to check identity status' },
      { status: 500 }
    );
  }
}
