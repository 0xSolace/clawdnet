import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// POST /api/v1/agents/heartbeat - Agent heartbeat/status update
export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);

    // Look up agent by API key
    const { data: agent, error: lookupError } = await supabase
      .from('agents')
      .select('id, handle, name, status')
      .eq('api_key', apiKey)
      .single();

    if (lookupError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse body for optional status/metadata
    const body = await request.json().catch(() => ({}));
    const { status, metadata, capabilities, version } = body;

    // Update agent status and last_heartbeat
    const updates: Record<string, any> = {
      last_heartbeat: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status && ['online', 'busy', 'offline'].includes(status)) {
      updates.status = status;
    }

    if (metadata) {
      updates.metadata = metadata;
    }

    if (capabilities && Array.isArray(capabilities)) {
      updates.capabilities = capabilities;
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', agent.id);

    if (updateError) {
      console.error('Heartbeat update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      handle: agent.handle,
      status: status || agent.status,
      nextHeartbeatMs: 60000, // Suggest heartbeat every 60s
      serverTime: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/v1/agents/heartbeat - Check heartbeat config
export async function GET() {
  return NextResponse.json({
    intervalMs: 60000,
    staleAfterMs: 180000, // Consider offline after 3 minutes without heartbeat
    endpoint: '/api/v1/agents/heartbeat',
    methods: ['POST'],
    requiredHeaders: {
      'Authorization': 'Bearer <api_key>',
    },
    optionalBody: {
      status: 'online | busy | offline',
      metadata: 'object - custom agent metadata',
      capabilities: 'array - updated capabilities list',
      version: 'string - agent version',
    },
  });
}
