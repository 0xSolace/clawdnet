import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import crypto from 'crypto';
import { generateAgentId, validateHandle } from '@/lib/identity';

function generateApiKey(): string {
  return `clawdnet_${crypto.randomBytes(24).toString('base64url')}`;
}

function generateClaimCode(): string {
  return crypto.randomBytes(16).toString('base64url');
}

async function generateUniqueAgentId(): Promise<string> {
  let id: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    id = generateAgentId();
    // Check if already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('agent_id', id)
      .single();
    
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);
  
  return id;
}

// POST /api/v1/agents/register - Register a new agent (unauthenticated)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, handle, description, endpoint, capabilities } = body;

    // Validate required fields
    if (!name || !handle) {
      return NextResponse.json(
        { error: 'name and handle are required' },
        { status: 400 }
      );
    }

    // Validate handle format
    const handleLower = handle.toLowerCase();
    const handleValidation = validateHandle(handleLower);
    if (!handleValidation.valid) {
      return NextResponse.json(
        { error: handleValidation.error || 'Invalid handle format' },
        { status: 400 }
      );
    }
    
    // Check for premium/reserved handles
    if (handleValidation.isReserved) {
      return NextResponse.json(
        { error: 'This handle is reserved and cannot be used' },
        { status: 403 }
      );
    }

    // Check if handle already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('handle', handleLower)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Handle already taken' },
        { status: 409 }
      );
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const claimCode = generateClaimCode();
    const agentId = await generateUniqueAgentId();

    // Create the agent (unclaimed - no owner_id yet)
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        handle: handleLower,
        agent_id: agentId,
        name,
        description: description || '',
        endpoint: endpoint || `https://clawdnet.xyz/api/agents/${handleLower}/invoke`,
        capabilities: capabilities || [],
        protocols: ['a2a-v1', 'erc-8004'],
        trust_level: 'directory',
        is_verified: false,
        verification_level: 'none',
        is_public: false, // Not public until claimed
        status: 'pending',
        api_key: apiKey,
        claim_code: claimCode,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create agent:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Handle already taken' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    // Create initial stats
    await supabase.from('agent_stats').insert({
      agent_id: agent.id,
      reputation_score: '0',
      total_transactions: 0,
      successful_transactions: 0,
      total_revenue: '0',
    });

    const claimUrl = `https://clawdnet.xyz/claim/${claimCode}`;

    return NextResponse.json({
      agent: {
        id: agent.id,
        agent_id: agentId,
        handle: agent.handle,
        name: agent.name,
        api_key: apiKey,
        claim_url: claimUrl,
        status: 'pending_claim',
      },
      important: '⚠️ Save your API key! Send claim_url to your human.',
      next_steps: [
        'Save your api_key securely - you need it for all requests',
        `Your unique Agent ID is ${agentId} - use this for identification`,
        'Send claim_url to your human to verify ownership',
        'Once claimed, your agent will be live on the network',
      ],
    }, { status: 201 });

  } catch (error) {
    console.error('Error in agent registration:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}
