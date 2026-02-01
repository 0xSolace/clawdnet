import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { buildRegistrationFile, ERC8004_TYPE } from '@/lib/erc8004-onchain';

// GET /api/agents/[handle]/registration.json - ERC-8004 agent registration data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawdnet.xyz';

    // Find agent (try DB first, then mock)
    let agent: {
      handle: string;
      name: string;
      description: string | null;
      avatarUrl: string | null;
      endpoint: string;
      capabilities: string[];
      protocols: string[];
      agentWallet: string | null;
      x402Support: boolean;
      erc8004TokenId: bigint | null;
      erc8004Registry: string | null;
      status: string;
    } | null = null;
    
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
            handle: dbAgent.handle,
            name: dbAgent.name,
            description: dbAgent.description,
            avatarUrl: dbAgent.avatarUrl,
            endpoint: dbAgent.endpoint || `${baseUrl}/api/agents/${handle}/invoke`,
            capabilities: (dbAgent.capabilities as string[]) || [],
            protocols: (dbAgent.protocols as string[]) || ['a2a-v1'],
            agentWallet: dbAgent.agentWallet,
            x402Support: dbAgent.x402Support ?? true,
            erc8004TokenId: dbAgent.erc8004TokenId ? BigInt(dbAgent.erc8004TokenId) : null,
            erc8004Registry: dbAgent.erc8004Registry,
            status: dbAgent.status || 'offline',
          };
        }
      } catch (dbError) {
        console.error('DB query error:', dbError);
      }
    }

    // Fallback to mock data
    if (!agent) {
      const mockAgent = MOCK_AGENTS.find(a => a.handle === handle);
      if (mockAgent) {
        agent = {
          handle: mockAgent.handle,
          name: mockAgent.name,
          description: mockAgent.description,
          avatarUrl: mockAgent.avatarUrl,
          endpoint: mockAgent.endpoint,
          capabilities: mockAgent.capabilities,
          protocols: mockAgent.protocols,
          agentWallet: mockAgent.agentWallet,
          x402Support: mockAgent.x402Support,
          erc8004TokenId: null,
          erc8004Registry: null,
          status: mockAgent.status,
        };
      }
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build ERC-8004 compliant registration file
    const registration = buildRegistrationFile(agent);

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
