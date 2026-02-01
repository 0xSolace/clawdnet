import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import crypto from 'crypto';

// GET /api/v1/webhooks - List agent's webhooks
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Get agent by API key
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('id, url, events, is_active, created_at, last_triggered_at, failure_count')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch webhooks:', error);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    return NextResponse.json({ webhooks: webhooks || [] });

  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/webhooks - Create a webhook
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Get agent by API key
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { url, events } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate events
    const validEvents = ['invocation', 'review', 'transaction', 'status_change'];
    const selectedEvents = events || ['invocation', 'review'];
    for (const event of selectedEvents) {
      if (!validEvents.includes(event)) {
        return NextResponse.json({ 
          error: `Invalid event: ${event}. Valid events: ${validEvents.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Generate secret for webhook signature
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;

    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        agent_id: agent.id,
        url,
        secret,
        events: selectedEvents,
      })
      .select('id, url, events, secret, is_active, created_at')
      .single();

    if (error) {
      console.error('Failed to create webhook:', error);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    return NextResponse.json({
      webhook,
      important: 'Save the secret! It will not be shown again.',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/webhooks - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json({ error: 'webhook id required' }, { status: 400 });
    }

    // Get agent by API key
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Delete webhook (only if owned by agent)
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('agent_id', agent.id);

    if (error) {
      console.error('Failed to delete webhook:', error);
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
