// ERC-8004: Trustless Agents Standard
// https://eips.ethereum.org/EIPS/eip-8004

export const ERC8004_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

// Service definition
export interface ERC8004Service {
  name: string; // 'web', 'A2A', 'MCP', 'OASF', 'ENS', 'DID', 'email', etc.
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

// On-chain registration reference
export interface ERC8004OnChainRegistration {
  agentId: number; // ERC-721 tokenId
  agentRegistry: string; // e.g., 'eip155:8453:0x742...'
}

// Full registration file format
export interface ERC8004RegistrationFile {
  type: typeof ERC8004_TYPE;
  name: string;
  description: string;
  image: string | null;
  services: ERC8004Service[];
  x402Support: boolean;
  active: boolean;
  registrations: ERC8004OnChainRegistration[];
  supportedTrust: ERC8004TrustType[];
}

// Trust types supported by ERC-8004
export type ERC8004TrustType = 
  | 'reputation'
  | 'crypto-economic'
  | 'tee-attestation'
  | 'zkml';

// ClawdNet Agent with ERC-8004 extensions
export interface ClawdNetAgent {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  endpoint: string;
  capabilities: string[];
  protocols: string[];
  trustLevel: string;
  isVerified: boolean;
  status: 'online' | 'busy' | 'offline';
  links: {
    website?: string;
    github?: string;
    docs?: string;
  } | null;
  
  // ERC-8004 fields
  erc8004Active?: boolean;
  x402Support?: boolean;
  agentWallet?: string;
  services?: ERC8004Service[];
  registrations?: ERC8004OnChainRegistration[];
  supportedTrust?: ERC8004TrustType[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  stats?: {
    reputationScore: string;
    totalTransactions: number;
    successfulTransactions: number;
    totalRevenue: string;
    avgResponseMs: number;
    uptimePercent: string;
    reviewsCount: number;
    avgRating: string;
  } | null;
}

// Generate ERC-8004 registration file from ClawdNet agent
export function toERC8004Registration(agent: ClawdNetAgent): ERC8004RegistrationFile {
  const baseUrl = 'https://clawdnet.xyz';
  
  // Build services list
  const services: ERC8004Service[] = [
    {
      name: 'web',
      endpoint: `${baseUrl}/agents/${agent.handle}`,
    },
    {
      name: 'A2A',
      endpoint: `${baseUrl}/api/agents/${agent.handle}`,
      version: '0.3.0',
    },
    {
      name: 'clawdnet',
      endpoint: `${baseUrl}/api/agents/${agent.handle}/invoke`,
      version: '0.1.0',
      skills: agent.capabilities,
    },
  ];

  // Add agent's custom services
  if (agent.services) {
    services.push(...agent.services);
  }

  // Add link-based services
  if (agent.links?.github) {
    services.push({ name: 'github', endpoint: agent.links.github });
  }
  if (agent.links?.website) {
    services.push({ name: 'website', endpoint: agent.links.website });
  }
  if (agent.links?.docs) {
    services.push({ name: 'docs', endpoint: agent.links.docs });
  }

  // Build registrations
  const registrations: ERC8004OnChainRegistration[] = agent.registrations || [
    {
      agentId: parseInt(agent.id) || 0,
      agentRegistry: 'clawdnet:directory:clawdnet.xyz',
    },
  ];

  return {
    type: ERC8004_TYPE,
    name: agent.name,
    description: agent.description || `${agent.name} - AI Agent on ClawdNet`,
    image: agent.avatarUrl || `${baseUrl}/api/og?handle=${agent.handle}`,
    services,
    x402Support: agent.x402Support ?? true,
    active: agent.status !== 'offline',
    registrations,
    supportedTrust: agent.supportedTrust || ['reputation'],
  };
}

// Validate an ERC-8004 registration file
export function validateERC8004Registration(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Registration must be an object'] };
  }

  const reg = data as Record<string, unknown>;

  // Required fields
  if (reg.type !== ERC8004_TYPE) {
    errors.push(`Invalid type. Expected: ${ERC8004_TYPE}`);
  }
  if (!reg.name || typeof reg.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  if (!reg.description || typeof reg.description !== 'string') {
    errors.push('description is required and must be a string');
  }
  if (!Array.isArray(reg.services)) {
    errors.push('services must be an array');
  } else {
    reg.services.forEach((service: unknown, i: number) => {
      if (!service || typeof service !== 'object') {
        errors.push(`services[${i}] must be an object`);
      } else {
        const s = service as Record<string, unknown>;
        if (!s.name || typeof s.name !== 'string') {
          errors.push(`services[${i}].name is required`);
        }
        if (!s.endpoint || typeof s.endpoint !== 'string') {
          errors.push(`services[${i}].endpoint is required`);
        }
      }
    });
  }
  if (typeof reg.x402Support !== 'boolean') {
    errors.push('x402Support must be a boolean');
  }
  if (typeof reg.active !== 'boolean') {
    errors.push('active must be a boolean');
  }
  if (!Array.isArray(reg.registrations)) {
    errors.push('registrations must be an array');
  }

  return { valid: errors.length === 0, errors };
}

// Chain IDs for common networks
export const CHAIN_IDS = {
  mainnet: 1,
  base: 8453,
  'base-sepolia': 84532,
  optimism: 10,
  arbitrum: 42161,
} as const;

// Format registry address in ERC-8004 format
export function formatAgentRegistry(chainId: number, contractAddress: string): string {
  return `eip155:${chainId}:${contractAddress}`;
}

// Parse registry address
export function parseAgentRegistry(registry: string): { namespace: string; chainId: number; address: string } | null {
  const parts = registry.split(':');
  if (parts.length !== 3) return null;
  
  const [namespace, chainIdStr, address] = parts;
  const chainId = parseInt(chainIdStr);
  
  if (isNaN(chainId)) return null;
  
  return { namespace, chainId, address };
}
