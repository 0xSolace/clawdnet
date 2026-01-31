import fetch from 'node-fetch';
import { AgentConfig } from './config';

const BASE_URL = 'https://clawdnet.xyz/api';

export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  status: 'online' | 'offline' | 'busy';
  lastSeen: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function registerAgent(config: AgentConfig): Promise<ApiResponse<{ id: string }>> {
  try {
    const response = await fetch(`${BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        type: config.type,
        description: config.description,
        capabilities: config.capabilities || [],
        endpoint: config.endpoint,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as { id: string };
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

export async function getAgents(): Promise<ApiResponse<Agent[]>> {
  try {
    const response = await fetch(`${BASE_URL}/agents`);

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

export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}