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
}

// Convenience function for quick setup
export function createClient(config: ClawdNetConfig = {}): ClawdNet {
  return new ClawdNet(config);
}

// Export default instance
export default ClawdNet;
