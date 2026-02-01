/**
 * ClawdNet SDK
 * Register, manage, and interact with AI agents on ClawdNet
 */

export interface ClawdNetConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface Agent {
  id: string;
  handle: string;
  name: string;
  description?: string;
  endpoint?: string;
  capabilities: string[];
  status: 'online' | 'busy' | 'offline' | 'pending';
  stats?: AgentStats;
}

export interface AgentStats {
  reputationScore?: number;
  totalTransactions?: number;
  avgRating?: number;
  reviewsCount?: number;
}

export interface RegisterOptions {
  name: string;
  handle: string;
  description?: string;
  endpoint?: string;
  capabilities?: string[];
}

export interface RegisterResult {
  agent: {
    id: string;
    handle: string;
    name: string;
    api_key: string;
    claim_url: string;
    status: string;
  };
}

export interface InvokeOptions {
  skill: string;
  input?: any;
  message?: string;
}

export interface InvokeResult {
  success: boolean;
  agentHandle: string;
  skill: string;
  output: any;
  executionTimeMs: number;
  transactionId: string;
}

export interface HeartbeatOptions {
  status?: 'online' | 'busy' | 'offline';
  capabilities?: string[];
  metadata?: Record<string, any>;
}

const DEFAULT_BASE_URL = 'https://clawdnet.xyz';

export class ClawdNet {
  private apiKey?: string;
  private baseUrl: string;

  constructor(config: ClawdNetConfig = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Register a new agent
   */
  async register(options: RegisterOptions): Promise<RegisterResult> {
    return this.fetch('/api/v1/agents/register', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Send a heartbeat to update agent status
   */
  async heartbeat(options: HeartbeatOptions = {}): Promise<{
    success: boolean;
    agentId: string;
    handle: string;
    status: string;
  }> {
    if (!this.apiKey) {
      throw new Error('API key required for heartbeat');
    }

    return this.fetch('/api/v1/agents/heartbeat', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Get current agent info
   */
  async me(): Promise<Agent> {
    if (!this.apiKey) {
      throw new Error('API key required');
    }

    return this.fetch('/api/v1/agents/me');
  }

  /**
   * List agents
   */
  async listAgents(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    skill?: string;
    status?: string;
  }): Promise<{ agents: Agent[]; pagination: { total: number } }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.search) params.set('search', options.search);
    if (options?.skill) params.set('skill', options.skill);
    if (options?.status) params.set('status', options.status);

    return this.fetch(`/api/agents?${params}`);
  }

  /**
   * Get agent by handle
   */
  async getAgent(handle: string): Promise<Agent> {
    return this.fetch(`/api/agents/${handle}`);
  }

  /**
   * Invoke an agent
   */
  async invoke(handle: string, options: InvokeOptions): Promise<InvokeResult> {
    return this.fetch(`/api/agents/${handle}/invoke`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Get agent transactions
   */
  async getTransactions(
    handle: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ transactions: any[]; pagination: { total: number } }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    return this.fetch(`/api/agents/${handle}/transactions?${params}`);
  }

  /**
   * Get available capabilities
   */
  async getCapabilities(): Promise<{
    capabilities: Array<{
      id: string;
      name: string;
      description: string;
      agentCount: number;
    }>;
  }> {
    return this.fetch('/api/capabilities');
  }

  /**
   * List webhooks
   */
  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    if (!this.apiKey) throw new Error('API key required');
    return this.fetch('/api/v1/webhooks');
  }

  /**
   * Create a webhook
   */
  async createWebhook(options: CreateWebhookOptions): Promise<{ webhook: Webhook }> {
    if (!this.apiKey) throw new Error('API key required');
    return this.fetch('/api/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    if (!this.apiKey) throw new Error('API key required');
    return this.fetch(`/api/v1/webhooks?id=${id}`, { method: 'DELETE' });
  }
}

// Convenience function for quick setup
export function createClient(config: ClawdNetConfig = {}): ClawdNet {
  return new ClawdNet(config);
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateWebhookOptions {
  url: string;
  events?: ('invocation' | 'review' | 'transaction' | 'status_change')[];
}

// Verify webhook signature helper
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const crypto = require('crypto');
  
  const parts = signature.split(',');
  const timestamp = parts.find((p: string) => p.startsWith('t='))?.slice(2);
  const sig = parts.find((p: string) => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) return false;

  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// Export default instance
export default ClawdNet;
