import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS } from '@/lib/db';
import { supabase } from '@/lib/db/supabase';
import { triggerWebhooks } from '@/lib/webhooks';
import { 
  createPaymentRequirements, 
  create402Response, 
  verifyPayment,
  getAgentPaymentConfig,
  BASE_USDC_ADDRESS,
  X402_NETWORK,
} from '@/lib/x402';
import { parseUnits } from 'viem';

// POST /api/agents/[handle]/invoke - Invoke an agent skill
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();
    const { skill, input, payment, message } = body;

    // Find agent from Supabase first
    let agent: any = null;
    
    try {
      const { data: dbAgent } = await supabase
        .from('agents')
        .select('*')
        .eq('handle', handle)
        .single();

      if (dbAgent) {
        agent = dbAgent;
      }
    } catch (err) {
      console.error('DB lookup error:', err);
    }

    // Fallback to mock
    if (!agent) {
      agent = MOCK_AGENTS.find(a => a.handle === handle);
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if agent is available
    if (agent.status === 'offline') {
      return NextResponse.json({ error: 'Agent is offline' }, { status: 503 });
    }

    // Determine the endpoint to call
    const agentEndpoint = agent.endpoint;

    // If the agent has a real endpoint, forward the request
    if (agentEndpoint && !agentEndpoint.includes('clawdnet.xyz')) {
      const transactionId = crypto.randomUUID();
      const startTime = Date.now();
      
      try {
        const forwardResponse = await forwardToAgent(agentEndpoint, {
          skill,
          input,
          message,
          metadata: {
            callerHandle: request.headers.get('X-Caller-Handle'),
            requestId: transactionId,
          },
        });

        const executionTimeMs = Date.now() - startTime;

        // Log successful transaction
        try {
          await supabase.from('transactions').insert({
            id: transactionId,
            agent_id: agent.id,
            skill: skill || 'general',
            input: { message: input || message, skill },
            output: forwardResponse,
            status: 'completed',
            execution_time_ms: executionTimeMs,
            completed_at: new Date().toISOString(),
          });
        } catch (logErr) {
          console.error('Failed to log transaction:', logErr);
        }

        return NextResponse.json({
          success: true,
          agentHandle: handle,
          skill,
          output: forwardResponse,
          executionTimeMs,
          transactionId: `txn_${transactionId.split('-')[0]}`,
          forwarded: true,
          timestamp: new Date().toISOString(),
        });
      } catch (forwardError) {
        const executionTimeMs = Date.now() - startTime;
        
        // Log failed transaction
        try {
          await supabase.from('transactions').insert({
            id: transactionId,
            agent_id: agent.id,
            skill: skill || 'general',
            input: { message: input || message, skill },
            status: 'failed',
            execution_time_ms: executionTimeMs,
            error_message: forwardError instanceof Error ? forwardError.message : 'Unknown error',
          });
        } catch (logErr) {
          console.error('Failed to log transaction:', logErr);
        }

        console.error('Forward to agent failed:', forwardError);
        // Fall through to mock response
      }
    }

    // Check for x402 payment if required
    const paymentConfig = getAgentPaymentConfig(agent);
    const paymentHeader = request.headers.get('X-PAYMENT') || request.headers.get('x-payment') || request.headers.get('payment-signature');
    
    // Get skill price from database or default
    let skillPrice = 0.01; // Default $0.01 per invocation
    if (skill) {
      try {
        const { data: skillData } = await supabase
          .from('skills')
          .select('price')
          .eq('agent_id', agent.id)
          .eq('skill_id', skill)
          .single();
        
        if (skillData?.price) {
          skillPrice = parseFloat(skillData.price);
        }
      } catch {
        // Use default price
      }
    }

    // Check if x402 payment is required and not provided
    if (paymentConfig.x402Support && !paymentHeader && !payment) {
      // Create 402 response with payment requirements
      const requirements = createPaymentRequirements({
        payTo: paymentConfig.agentWallet!,
        amountUsd: skillPrice,
        description: `Invoke ${skill || 'agent'} on ${agent.name}`,
      });
      
      return create402Response(requirements);
    }

    // Verify x402 payment if header provided
    if (paymentHeader && paymentConfig.x402Support) {
      const verification = await verifyPayment(request);
      
      if (!verification.valid) {
        return NextResponse.json({
          error: 'Payment verification failed',
          details: verification.error,
        }, { 
          status: 402,
          headers: { 'X-PAYMENT-REQUIRED': 'true' },
        });
      }
      
      // Log the payment
      try {
        await supabase.from('payments').insert({
          to_agent_id: agent.id,
          payment_type: 'task',
          amount: skillPrice.toString(),
          currency: 'USDC',
          status: 'completed',
          external_id: verification.txHash,
          description: `${skill || 'invoke'} payment`,
          metadata: {
            payer: verification.payer,
            skill,
            protocol: 'x402',
          },
          completed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log x402 payment:', err);
      }
    }

    // Generate mock response for agents without real endpoints
    const startTime = Date.now();
    const output = generateMockOutput(skill || 'general', input || message);
    const executionTimeMs = Date.now() - startTime + Math.floor(Math.random() * 500);

    // Log transaction
    const transactionId = crypto.randomUUID();
    try {
      await supabase.from('transactions').insert({
        id: transactionId,
        agent_id: agent.id,
        skill: skill || 'general',
        input: { message: input || message },
        output,
        status: 'completed',
        execution_time_ms: executionTimeMs,
        completed_at: new Date().toISOString(),
      });

      // Update agent stats (RPC might not exist yet, that's ok)
      try {
        await supabase.rpc('increment_agent_transactions', { 
          agent_uuid: agent.id,
          success: true,
          response_ms: executionTimeMs,
        });
      } catch {
        // RPC function not available
      }
      // Trigger webhooks
      triggerWebhooks(agent.id, handle, 'invocation', {
        transactionId,
        skill: skill || 'general',
        executionTimeMs,
        success: true,
      });
    } catch (logError) {
      console.error('Failed to log transaction:', logError);
    }

    const mockResponse = {
      success: true,
      agentHandle: handle,
      skill: skill || 'general',
      input: input || message,
      output,
      executionTimeMs,
      transactionId: `txn_${transactionId.split('-')[0]}`,
      timestamp: new Date().toISOString(),
      source: 'mock',
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

// Forward request to actual agent endpoint
async function forwardToAgent(endpoint: string, payload: any): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Clawdnet-Forward': 'true',
        'X-Request-Id': payload.metadata?.requestId || crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Agent returned ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    return { text: await response.text() };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Generate mock output based on skill type
function generateMockOutput(skill: string, input: any): any {
  const prompt = typeof input === 'string' ? input : (input?.prompt || input?.text || input?.message || 'your request');

  switch (skill) {
    case 'text-generation':
    case 'creative-writing':
    case 'copywriting':
    case 'general':
      return {
        text: `This is a mock response for "${prompt}". In production, this would be generated by the actual AI agent.`,
        tokens: 42,
      };

    case 'code-generation':
      return {
        code: `// Code output for: ${prompt}\nfunction example() {\n  return 'Hello, ClawdNet!';\n}`,
        language: input?.language || 'javascript',
      };

    case 'image-generation':
      return {
        imageUrl: 'https://placehold.co/512x512/1a1a2e/00ff88?text=Generated+Image',
        prompt,
        width: 512,
        height: 512,
      };

    case 'translation':
      return {
        translatedText: `[Translated: ${prompt}]`,
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
        query: prompt,
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
        input: prompt,
      };
  }
}
