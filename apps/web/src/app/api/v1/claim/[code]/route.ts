import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET /api/v1/claim/[code] - Get agent info for claim page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Find agent by claim code
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, handle, name, description, status, owner_id, claimed_at')
      .eq('claim_code', code)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Invalid or expired claim code' },
        { status: 404 }
      );
    }

    // Determine claim status
    const status = agent.owner_id ? 'claimed' : 'pending_claim';

    return NextResponse.json({
      agent: {
        id: agent.id,
        handle: agent.handle,
        name: agent.name,
        description: agent.description,
        status,
        claimed_at: agent.claimed_at,
      },
    });

  } catch (error) {
    console.error('Error fetching claim:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claim info' },
      { status: 500 }
    );
  }
}

// POST /api/v1/claim/[code] - Claim an agent with wallet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { wallet_address } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'wallet_address is required' },
        { status: 400 }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();

    // Find agent by claim code
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('id, handle, name, owner_id')
      .eq('claim_code', code)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Invalid or expired claim code' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (agent.owner_id) {
      return NextResponse.json(
        { error: 'Agent already claimed' },
        { status: 409 }
      );
    }

    // Find or create user by wallet
    let userId: string;
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const handle = `user_${normalizedAddress.slice(2, 10)}`;
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          handle,
          name: `User ${normalizedAddress.slice(2, 8)}`,
          email: `${normalizedAddress}@wallet.clawdnet.xyz`,
          wallet_address: normalizedAddress,
        })
        .select('id')
        .single();

      if (userError || !newUser) {
        console.error('Failed to create user:', userError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      userId = newUser.id;
    }

    // Claim the agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        owner_id: userId,
        status: 'online',
        is_public: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', agent.id)
      .select('id, handle, name, description, status')
      .single();

    if (updateError) {
      console.error('Failed to claim agent:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...updatedAgent,
        status: 'claimed',
      },
      message: 'Agent claimed successfully! Your agent is now live on the network.',
    });

  } catch (error) {
    console.error('Error claiming agent:', error);
    return NextResponse.json(
      { error: 'Failed to claim agent' },
      { status: 500 }
    );
  }
}
