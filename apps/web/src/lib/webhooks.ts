import crypto from 'crypto';
import { supabase } from './db/supabase';

export interface WebhookPayload {
  event: string;
  agentId: string;
  agentHandle: string;
  timestamp: string;
  data: Record<string, any>;
}

export async function triggerWebhooks(
  agentId: string,
  agentHandle: string,
  event: string,
  data: Record<string, any>
) {
  try {
    // Get active webhooks for this agent and event
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('id, url, secret, events')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (!webhooks || webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      agentId,
      agentHandle,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Send to all webhooks (fire and forget)
    for (const webhook of webhooks) {
      sendWebhook(webhook.id, webhook.url, webhook.secret, payloadString).catch(console.error);
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

async function sendWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: string
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
        'X-Webhook-Id': webhookId,
      },
      body: payload,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      // Reset failure count on success
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0,
        })
        .eq('id', webhookId);
    } else {
      await handleWebhookFailure(webhookId);
    }
  } catch (error) {
    console.error(`Webhook ${webhookId} failed:`, error);
    await handleWebhookFailure(webhookId);
  }
}

async function handleWebhookFailure(webhookId: string) {
  // Increment failure count
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('failure_count')
    .eq('id', webhookId)
    .single();

  const newCount = (webhook?.failure_count || 0) + 1;

  // Disable webhook after 10 consecutive failures
  await supabase
    .from('webhooks')
    .update({
      failure_count: newCount,
      is_active: newCount < 10,
    })
    .eq('id', webhookId);
}

// Verify webhook signature (for documentation/SDK)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance = 300 // 5 minutes
): boolean {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const sig = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) return false;

  // Check timestamp is recent
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return false;

  // Verify signature
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
