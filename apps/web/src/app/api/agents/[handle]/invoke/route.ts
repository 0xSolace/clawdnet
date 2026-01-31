import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS, getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// x402 Payment Requirements
interface X402PaymentRequired {
  version: '1';
  accepts: Array<{
    scheme: 'exact';
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
  }>;
  error?: string;
}

// USDC contract addresses by network
const USDC_ADDRESSES: Record<string, string> = {
  'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet
};

// x402 Facilitator URL (testnet)
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// Verify payment with x402 facilitator
async function verifyPaymentWithFacilitator(
  paymentHeader: string,
  resource: string,
  payTo: string,
  price: string,
  network: string = 'eip155:84532'
): Promise<{ valid: boolean; error?: string; settlementId?: string }> {
  try {
    // Decode the payment header (base64 encoded JSON)
    let paymentData;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      paymentData = JSON.parse(decoded);
    } catch {
      // Try as direct JSON
      paymentData = typeof paymentHeader === 'string' ? JSON.parse(paymentHeader) : paymentHeader;
    }

    // Call facilitator to verify/settle the payment
    const response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment: paymentData,
        paymentRequirements: {
          scheme: 'exact',
          network,
          maxAmountRequired: price,
          resource,
          payTo,
          asset: USDC_ADDRESSES[network] || USDC_ADDRESSES['eip155:84532'],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        valid: false, 
        error: errorData.error || `Facilitator returned ${response.status}` 
      };
    }

    const result = await response.json();
    return { 
      valid: result.valid === true || result.success === true,
      settlementId: result.settlementId || result.transactionHash,
      error: result.error,
    };
  } catch (error) {
    console.error('x402 facilitator verification error:', error);
    return { 
      valid: false, 
      error: `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// POST /api/agents/[handle]/invoke - Invoke an agent skill
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();
    const { skill, input, payment } = body;

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
            endpoint: dbAgent.endpoint || `https://clawdnet.xyz/api/agents/${handle}/invoke`,
            capabilities: (dbAgent.capabilities as string[]) || [],
            status: 'online' as const,
            isVerified: dbAgent.isVerified || false,
            x402Support: dbAgent.x402Support || false,
            agentWallet: dbAgent.agentWallet || '0x0000000000000000000000000000000000000000',
            avatarUrl: dbAgent.avatarUrl ?? null,
            protocols: (dbAgent.protocols as string[]) || [],
            trustLevel: (dbAgent.trustLevel as 'directory' | 'onchain' | 'tee' | 'custom') || 'directory',
            links: (dbAgent.links as Record<string, string>) ?? null,
            erc8004Active: dbAgent.erc8004Active || false,
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

    // Check if agent is available
    if (agent.status === 'offline') {
      return NextResponse.json({ error: 'Agent is offline' }, { status: 503 });
    }

    // Find the requested skill and determine price
    const skillInfo = agent.capabilities.includes(skill) 
      ? { skillId: skill, price: '0.01' } // Default price in USDC
      : null;

    if (!skillInfo) {
      return NextResponse.json({ 
        error: 'Skill not available',
        availableSkills: agent.capabilities,
      }, { status: 400 });
    }

    // Check for x402 payment header
    const paymentHeader = request.headers.get('X-PAYMENT') || request.headers.get('x-payment');
    const network = 'eip155:84532'; // Base Sepolia for testing
    const resource = `/api/agents/${handle}/invoke`;
    const payTo = agent.agentWallet || '0x0000000000000000000000000000000000000000';
    
    // If no payment provided and price > 0, return 402 with payment requirements
    if (!paymentHeader && !payment && parseFloat(skillInfo.price) > 0 && agent.x402Support) {
      const paymentRequired: X402PaymentRequired = {
        version: '1',
        accepts: [
          {
            scheme: 'exact',
            network,
            maxAmountRequired: skillInfo.price,
            resource,
            description: `Invoke ${skill} on ${agent.name}`,
            mimeType: 'application/json',
            payTo,
            maxTimeoutSeconds: 300,
            asset: USDC_ADDRESSES[network],
          },
        ],
        error: 'Payment required to invoke this skill',
      };

      return NextResponse.json(paymentRequired, {
        status: 402,
        headers: {
          'X-PAYMENT-REQUIRED': 'true',
        },
      });
    }

    // If payment provided, verify with facilitator
    let settlementId: string | undefined;
    if ((paymentHeader || payment) && agent.x402Support) {
      const paymentToVerify = paymentHeader || JSON.stringify(payment);
      const verification = await verifyPaymentWithFacilitator(
        paymentToVerify,
        resource,
        payTo,
        skillInfo.price,
        network
      );

      if (!verification.valid) {
        return NextResponse.json({
          error: 'Payment verification failed',
          details: verification.error,
        }, { status: 402 });
      }

      settlementId = verification.settlementId;
      console.log('Payment verified:', { handle, skill, settlementId });
    }

    // Execute the agent invocation
    // In production, this would forward to the agent's actual endpoint
    // For now, generate mock output
    const mockResponse = {
      success: true,
      agentHandle: handle,
      skill,
      input,
      output: generateMockOutput(skill, input),
      executionTimeMs: Math.floor(Math.random() * 2000) + 500,
      transactionId: `txn_${crypto.randomUUID().split('-')[0]}`,
      settlementId,
      timestamp: new Date().toISOString(),
      source: settlementId ? 'paid' : 'free',
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Error invoking agent:', error);
    return NextResponse.json(
      { error: 'Failed to invoke agent' },
      { status: 500 }
    );
  }
}

// Generate mock output based on skill type
function generateMockOutput(skill: string, input: any): any {
  switch (skill) {
    case 'text-generation':
    case 'creative-writing':
    case 'copywriting':
      return {
        text: `This is a mock response for "${input?.prompt || input?.text || 'your request'}". In production, this would be generated by the actual AI agent.`,
        tokens: 42,
      };

    case 'code-generation':
      return {
        code: `// Code output for: ${input?.prompt || 'your request'}\nfunction example() {\n  return 'Hello, ClawdNet!';\n}`,
        language: input?.language || 'javascript',
      };

    case 'image-generation':
      return {
        imageUrl: 'https://placehold.co/512x512/1a1a2e/00ff88?text=Generated+Image',
        prompt: input?.prompt,
        width: 512,
        height: 512,
      };

    case 'translation':
      return {
        translatedText: `[Translated: ${input?.text || 'your text'}]`,
        sourceLanguage: input?.from || 'auto',
        targetLanguage: input?.to || 'en',
      };

    case 'web-search':
    case 'research':
      return {
        results: [
          { title: 'Result 1', url: 'https://example.com/1', snippet: 'Search result snippet.' },
          { title: 'Result 2', url: 'https://example.com/2', snippet: 'Another result.' },
        ],
        query: input?.query || input?.prompt,
      };

    case 'analysis':
    case 'fact-checking':
      return {
        analysis: 'Analysis complete. The input appears to be valid.',
        confidence: 0.85,
        sources: ['source-1', 'source-2'],
      };

    default:
      return {
        result: `Output for skill: ${skill}`,
        input,
      };
  }
}
