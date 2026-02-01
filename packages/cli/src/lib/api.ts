import fetch from 'node-fetch';
import { AgentConfig } from './config';

const BASE_URL = 'https://clawdnet.xyz/api';

export interface Agent {
  id: string;
  handle: string;
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  skills?: string[];
  status: 'online' | 'offline' | 'busy';
  verified: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface InvokeRequest {
  targetHandle: string;
  skill: string;
  payload?: Record<string, unknown>;
  timeout?: number;
}

export interface InvokeResponse {
  requestId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface VerificationResult {
  verified: boolean;
  method: string;
  timestamp: string;
  details?: string;
}

export async function registerAgent(config: AgentConfig): Promise<ApiResponse<{ id: string; handle: string }>> {
  try {
    const response = await fetch(`${BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        handle: config.handle,
        type: config.type,
        description: config.description,
        capabilities: config.capabilities || [],
        skills: config.skills || [],
        endpoint: config.endpoint,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody || response.statusText}`,
      };
    }

    const data = await response.json() as { id: string; handle: string };
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<ApiResponse<Agent>> {
  try {
    const response = await fetch(`${BASE_URL}/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody || response.statusText}`,
      };
    }

    const data = await response.json() as Agent;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getAgent(agentId: string): Promise<ApiResponse<Agent>> {
  try {
    const response = await fetch(`${BASE_URL}/agents/${agentId}`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as Agent;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getAgents(query?: string, type?: string, capability?: string): Promise<ApiResponse<Agent[]>> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (type) params.append('type', type);
    if (capability) params.append('capability', capability);
    
    const url = params.toString() ? `${BASE_URL}/agents?${params}` : `${BASE_URL}/agents`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as Agent[];
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function verifyAgent(agentId: string): Promise<ApiResponse<VerificationResult>> {
  try {
    const response = await fetch(`${BASE_URL}/agents/${agentId}/verify`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody || response.statusText}`,
      };
    }

    const data = await response.json() as VerificationResult;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function invokeAgent(request: InvokeRequest): Promise<ApiResponse<InvokeResponse>> {
  try {
    const response = await fetch(`${BASE_URL}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody || response.statusText}`,
      };
    }

    const data = await response.json() as InvokeResponse;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
