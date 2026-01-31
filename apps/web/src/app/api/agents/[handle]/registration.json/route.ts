import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// ERC-8004 Registration File Format
// https://eips.ethereum.org/EIPS/eip-8004
interface ERC8004Registration {
  // Required fields
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  
  // Optional fields
  image?: string;
  services?: Array<{
    name: string;
    endpoint: string;
    description?: string;
  }>;
  
  // Extended fields for ClawdNet
  capabilities?: string[];
  protocols?: string[];
  x402Support?: boolean;
  agentWallet?: string;
  trustLevel?: string;
  supportedTrust?: string[];
  active?: boolean;
  
  // Discovery metadata
  '@context'?: string;
  handle?: string;
  createdAt?: string;
  updatedAt?: string;
}

// GET /api/agents/[handle]/registration.json - ERC-8004 agent registration data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawdnet.xyz';

    // Find agent (try DB first, then mock)
    let agent = MOCK_AGENTS.find(a => a.handle === handle);
    
    const db = getDb();
    if (db) {
      try {
        const [dbAgent] = await db
          .select()
          .from(schema.agents)
          .where(eq(schema.agents.handle, handle))
          .limit(1);
        
        if (dbAgent) {
          agent = {
            id: dbAgent.id,
            handle: dbAgent.handle,
            name: dbAgent.name,
            description: dbAgent.description || '',
            avatarUrl: dbAgent.avatarUrl ?? null,
            endpoint: dbAgent.endpoint || `${baseUrl}/api/agents/${handle}/invoke`,
            capabilities: (dbAgent.capabilities as string[]) || [],
            protocols: (dbAgent.protocols as string[]) || [],
            trustLevel: (dbAgent.trustLevel as 'directory' | 'onchain' | 'tee' | 'custom') || 'directory',
            isVerified: dbAgent.isVerified || false,
            status: 'online' as const,
            links: (dbAgent.links as Record<string, string>) ?? null,
            erc8004Active: dbAgent.erc8004Active || false,
            x402Support: dbAgent.x402Support || false,
            agentWallet: dbAgent.agentWallet || '0x0000000000000000000000000000000000000000',
            supportedTrust: (dbAgent.supportedTrust as string[]) || [],
            createdAt: dbAgent.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: dbAgent.updatedAt?.toISOString() || new Date().toISOString(),
            owner: { id: '0', handle: 'system', name: 'System', avatarUrl: null },
            stats: {
              reputationScore: '4.5',
              totalTransactions: 0,
              successfulTransactions: 0,
              totalRevenue: '0',
              avgResponseMs: 0,
              uptimePercent: '99',
              reviewsCount: 0,
              avgRating: '0',
            },
          } as typeof MOCK_AGENTS[0];
        }
      } catch (dbError) {
        console.error('DB query error:', dbError);
      }
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build ERC-8004 registration object
    const registration: ERC8004Registration = {
      '@context': 'https://eips.ethereum.org/EIPS/eip-8004',
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: agent.name,
      description: agent.description,
      handle: agent.handle,
      
      // Image (avatar or placeholder)
      image: agent.avatarUrl || `${baseUrl}/api/og?agent=${handle}`,
      
      // Services - web, API, A2A endpoints
      services: [
        {
          name: 'web',
          endpoint: `${baseUrl}/agents/${handle}`,
          description: 'Human-readable agent profile page',
        },
        {
          name: 'invoke',
          endpoint: `${baseUrl}/api/agents/${handle}/invoke`,
          description: 'Agent invocation API (x402 enabled)',
        },
        {
          name: 'A2A',
          endpoint: `${baseUrl}/api/agents/${handle}/a2a`,
          description: 'Agent-to-Agent protocol endpoint',
        },
      ],
      
      // Capabilities and protocols
      capabilities: agent.capabilities,
      protocols: agent.protocols || ['a2a-v1', 'erc-8004'],
      
      // Payment support
      x402Support: agent.x402Support ?? true,
      agentWallet: agent.agentWallet || undefined,
      
      // Trust configuration
      trustLevel: agent.trustLevel || 'directory',
      supportedTrust: agent.supportedTrust || ['reputation'],
      
      // Status
      active: agent.erc8004Active ?? (agent.status !== 'offline'),
      
      // Timestamps
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };

    // Return with proper content type
    return NextResponse.json(registration, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error generating registration:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration' },
      { status: 500 }
    );
  }
}
