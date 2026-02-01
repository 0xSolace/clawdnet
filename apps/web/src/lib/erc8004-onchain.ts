/**
 * ERC-8004: Trustless Agents - On-Chain Integration
 * 
 * This module handles interaction with ERC-8004 identity and reputation registries
 * deployed on Base (and other EVM chains).
 * 
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */

import { createPublicClient, createWalletClient, http, type Address, type Hash, type Hex, encodeFunctionData, parseAbi, keccak256, toBytes } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================================================
// Constants & Configuration
// ============================================================================

export const ERC8004_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

// Registry addresses (testnet for now - deploy mainnet later)
export const REGISTRY_ADDRESSES = {
  // Base Sepolia testnet (for development)
  [baseSepolia.id]: {
    identity: null as Address | null, // Deploy and fill in
    reputation: null as Address | null,
    validation: null as Address | null,
  },
  // Base Mainnet (production)
  [base.id]: {
    identity: '0xA7A4A46EB5eF8E307BbEE54654F4FD343279f2cF' as Address, // Deployed 2026-02-01
    reputation: null as Address | null,
    validation: null as Address | null,
  },
} as const;

// Default chain for ClawdNet
export const DEFAULT_CHAIN_ID = base.id;
export const DEFAULT_TESTNET_CHAIN_ID = baseSepolia.id;

// ============================================================================
// Contract ABIs (from ERC-8004 spec)
// ============================================================================

export const IDENTITY_REGISTRY_ABI = parseAbi([
  // Events
  'event AgentRegistered(uint256 indexed agentId, string indexed agentDomain, address indexed agentAddress)',
  'event AgentUpdated(uint256 indexed agentId, string previousAgentDomain, string indexed newAgentDomain, address previousAgentAddress, address indexed newAgentAddress)',
  
  // Write functions
  'function newAgent(string agentDomain, address agentAddress) external returns (uint256 agentId)',
  'function updateAgent(uint256 agentId, string newAgentDomain, address newAgentAddress) external returns (bool success)',
  
  // Read functions
  'function getAgent(uint256 agentId) external view returns (uint256 agentId_, string agentDomain_, address agentAddress_)',
  'function resolveAgentByDomain(string agentDomain) external view returns (uint256 agentId_, string agentDomain_, address agentAddress_)',
  'function resolveAgentByAddress(address agentAddress) external view returns (uint256 agentId_, string agentDomain_, address agentAddress_)',
]);

export const REPUTATION_REGISTRY_ABI = parseAbi([
  // Events
  'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
  'event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)',
  'event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)',
  
  // Write functions
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external',
  'function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external',
  'function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash) external',
  
  // Read functions
  'function getIdentityRegistry() external view returns (address)',
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
  'function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)',
  'function getClients(uint256 agentId) external view returns (address[])',
  'function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)',
]);

// ============================================================================
// Types
// ============================================================================

export interface ERC8004Agent {
  agentId: bigint;
  domain: string;
  address: Address;
}

export interface ERC8004Feedback {
  agentId: bigint;
  clientAddress: Address;
  feedbackIndex: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

export interface ERC8004Registration {
  type: typeof ERC8004_TYPE;
  name: string;
  description: string;
  image: string | null;
  services: Array<{
    name: string;
    endpoint: string;
    version?: string;
    skills?: string[];
    domains?: string[];
  }>;
  x402Support: boolean;
  active: boolean;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  supportedTrust: string[];
}

export interface ClaimIdentityResult {
  success: boolean;
  txHash?: Hash;
  agentId?: bigint;
  error?: string;
}

export interface SyncReputationResult {
  success: boolean;
  txHash?: Hash;
  feedbackIndex?: bigint;
  error?: string;
}

// ============================================================================
// Client Helpers
// ============================================================================

function getChain(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`Unsupported chain: ${chainId}`);
}

export function getPublicClient(chainId: number = DEFAULT_CHAIN_ID) {
  const chain = getChain(chainId);
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export function getWalletClient(privateKey: Hex, chainId: number = DEFAULT_CHAIN_ID) {
  const chain = getChain(chainId);
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

// ============================================================================
// Registry Helper Functions
// ============================================================================

/**
 * Get registry addresses for a chain
 */
export function getRegistryAddresses(chainId: number) {
  const addresses = REGISTRY_ADDRESSES[chainId as keyof typeof REGISTRY_ADDRESSES];
  if (!addresses) {
    throw new Error(`No registry addresses configured for chain ${chainId}`);
  }
  return addresses;
}

/**
 * Format agent registry string in ERC-8004 format
 * @example formatAgentRegistry(8453, '0x742...') => 'eip155:8453:0x742...'
 */
export function formatAgentRegistry(chainId: number, contractAddress: Address): string {
  return `eip155:${chainId}:${contractAddress}`;
}

/**
 * Parse agent registry string
 */
export function parseAgentRegistry(registry: string): {
  namespace: string;
  chainId: number;
  address: Address;
} | null {
  const parts = registry.split(':');
  if (parts.length !== 3) return null;
  
  const [namespace, chainIdStr, address] = parts;
  const chainId = parseInt(chainIdStr);
  
  if (isNaN(chainId)) return null;
  if (!address.startsWith('0x')) return null;
  
  return { namespace, chainId, address: address as Address };
}

/**
 * Check if a registry is deployed on a chain
 */
export function isRegistryDeployed(chainId: number): boolean {
  try {
    const addresses = getRegistryAddresses(chainId);
    return addresses.identity !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// Identity Registry Functions
// ============================================================================

/**
 * Get agent by ID from the identity registry
 */
export async function getAgentById(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<ERC8004Agent | null> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.identity) return null;
  
  const client = getPublicClient(chainId);
  
  try {
    const result = await client.readContract({
      address: addresses.identity,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [agentId],
    });
    
    const [id, domain, address] = result as [bigint, string, Address];
    
    // Zero address means not found
    if (address === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    
    return { agentId: id, domain, address };
  } catch (error) {
    console.error('Error fetching agent:', error);
    return null;
  }
}

/**
 * Resolve agent by domain
 */
export async function resolveAgentByDomain(
  domain: string,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<ERC8004Agent | null> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.identity) return null;
  
  const client = getPublicClient(chainId);
  
  try {
    const result = await client.readContract({
      address: addresses.identity,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'resolveAgentByDomain',
      args: [domain],
    });
    
    const [id, resolvedDomain, address] = result as [bigint, string, Address];
    
    if (id === BigInt(0)) return null;
    
    return { agentId: id, domain: resolvedDomain, address };
  } catch (error) {
    console.error('Error resolving agent by domain:', error);
    return null;
  }
}

/**
 * Resolve agent by wallet address
 */
export async function resolveAgentByAddress(
  walletAddress: Address,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<ERC8004Agent | null> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.identity) return null;
  
  const client = getPublicClient(chainId);
  
  try {
    const result = await client.readContract({
      address: addresses.identity,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'resolveAgentByAddress',
      args: [walletAddress],
    });
    
    const [id, domain, address] = result as [bigint, string, Address];
    
    if (id === BigInt(0)) return null;
    
    return { agentId: id, domain, address };
  } catch (error) {
    console.error('Error resolving agent by address:', error);
    return null;
  }
}

/**
 * Register a new agent on-chain
 * This should be called by the user's wallet
 */
export async function registerAgent(
  domain: string,
  walletAddress: Address,
  privateKey: Hex,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<ClaimIdentityResult> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.identity) {
    return { success: false, error: 'Registry not deployed on this chain' };
  }
  
  const walletClient = getWalletClient(privateKey, chainId);
  const publicClient = getPublicClient(chainId);
  
  try {
    // Check if domain is already registered
    const existing = await resolveAgentByDomain(domain, chainId);
    if (existing) {
      return { success: false, error: 'Domain already registered' };
    }
    
    // Register the agent
    const hash = await walletClient.writeContract({
      address: addresses.identity,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'newAgent',
      args: [domain, walletAddress],
    });
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      // Get the agentId from the event logs
      const logs = receipt.logs;
      // Parse AgentRegistered event to get agentId
      // For simplicity, resolve by domain after registration
      const agent = await resolveAgentByDomain(domain, chainId);
      
      return {
        success: true,
        txHash: hash,
        agentId: agent?.agentId,
      };
    } else {
      return { success: false, error: 'Transaction reverted' };
    }
  } catch (error: any) {
    console.error('Error registering agent:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

// ============================================================================
// Reputation Registry Functions
// ============================================================================

/**
 * Submit feedback for an agent
 */
export async function submitFeedback(
  agentId: bigint,
  value: bigint,
  valueDecimals: number,
  options: {
    tag1?: string;
    tag2?: string;
    endpoint?: string;
    feedbackURI?: string;
    feedbackHash?: Hex;
  },
  privateKey: Hex,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<SyncReputationResult> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.reputation) {
    return { success: false, error: 'Reputation registry not deployed on this chain' };
  }
  
  const walletClient = getWalletClient(privateKey, chainId);
  const publicClient = getPublicClient(chainId);
  
  try {
    const hash = await walletClient.writeContract({
      address: addresses.reputation,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'giveFeedback',
      args: [
        agentId,
        value,
        valueDecimals,
        options.tag1 || '',
        options.tag2 || '',
        options.endpoint || '',
        options.feedbackURI || '',
        options.feedbackHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      ],
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      return { success: true, txHash: hash };
    } else {
      return { success: false, error: 'Transaction reverted' };
    }
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: error.message || 'Feedback submission failed' };
  }
}

/**
 * Get reputation summary for an agent
 */
export async function getReputationSummary(
  agentId: bigint,
  clientAddresses: Address[],
  options: {
    tag1?: string;
    tag2?: string;
  } = {},
  chainId: number = DEFAULT_CHAIN_ID
): Promise<{ count: bigint; value: bigint; decimals: number } | null> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.reputation) return null;
  
  const client = getPublicClient(chainId);
  
  try {
    const result = await client.readContract({
      address: addresses.reputation,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getSummary',
      args: [agentId, clientAddresses, options.tag1 || '', options.tag2 || ''],
    });
    
    const [count, value, decimals] = result as [bigint, bigint, number];
    return { count, value, decimals };
  } catch (error) {
    console.error('Error fetching reputation summary:', error);
    return null;
  }
}

/**
 * Get all clients who have given feedback to an agent
 */
export async function getFeedbackClients(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<Address[]> {
  const addresses = getRegistryAddresses(chainId);
  if (!addresses.reputation) return [];
  
  const client = getPublicClient(chainId);
  
  try {
    const result = await client.readContract({
      address: addresses.reputation,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getClients',
      args: [agentId],
    });
    
    return result as Address[];
  } catch (error) {
    console.error('Error fetching feedback clients:', error);
    return [];
  }
}

// ============================================================================
// Registration File Helpers
// ============================================================================

/**
 * Build an ERC-8004 compliant registration file from ClawdNet agent data
 */
export function buildRegistrationFile(agent: {
  handle: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  endpoint: string;
  capabilities: string[];
  protocols: string[];
  agentWallet?: string | null;
  x402Support?: boolean;
  erc8004TokenId?: bigint | null;
  erc8004Registry?: string | null;
}): ERC8004Registration {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawdnet.xyz';
  
  // Build registrations array
  const registrations: ERC8004Registration['registrations'] = [];
  
  // Add on-chain registration if exists
  if (agent.erc8004TokenId && agent.erc8004Registry) {
    registrations.push({
      agentId: Number(agent.erc8004TokenId),
      agentRegistry: agent.erc8004Registry,
    });
  }
  
  // Always include ClawdNet directory registration
  registrations.push({
    agentId: 0, // ClawdNet internal ID
    agentRegistry: `clawdnet:directory:${baseUrl}`,
  });
  
  return {
    type: ERC8004_TYPE,
    name: agent.name,
    description: agent.description || `${agent.name} - AI Agent on ClawdNet`,
    image: agent.avatarUrl || `${baseUrl}/api/og?handle=${agent.handle}`,
    services: [
      {
        name: 'web',
        endpoint: `${baseUrl}/agent/${agent.handle}`,
      },
      {
        name: 'A2A',
        endpoint: `${baseUrl}/api/agents/${agent.handle}`,
        version: '0.3.0',
      },
      {
        name: 'invoke',
        endpoint: `${baseUrl}/api/agents/${agent.handle}/invoke`,
        version: '1.0',
        skills: agent.capabilities,
      },
      {
        name: 'registration',
        endpoint: `${baseUrl}/api/agents/${agent.handle}/registration.json`,
        version: '1.0',
      },
    ],
    x402Support: agent.x402Support ?? true,
    active: true,
    registrations,
    supportedTrust: ['reputation'],
  };
}

/**
 * Generate a data URI for the registration file (for on-chain storage)
 */
export function registrationToDataUri(registration: ERC8004Registration): string {
  const json = JSON.stringify(registration);
  const base64 = Buffer.from(json).toString('base64');
  return `data:application/json;base64,${base64}`;
}

/**
 * Hash content for feedbackHash field
 */
export function hashContent(content: string): Hex {
  return keccak256(toBytes(content));
}

/**
 * Convert ClawdNet rating (1-5) to ERC-8004 value (0-100)
 */
export function ratingToERC8004Value(rating: number): { value: bigint; decimals: number } {
  // Convert 1-5 to 0-100 scale
  const normalized = Math.round(((rating - 1) / 4) * 100);
  return { value: BigInt(normalized), decimals: 0 };
}

/**
 * Convert ERC-8004 value to ClawdNet rating (1-5)
 */
export function erc8004ValueToRating(value: bigint, decimals: number): number {
  const normalized = Number(value) / Math.pow(10, decimals);
  // Convert 0-100 to 1-5 scale
  return Math.round((normalized / 100) * 4 + 1);
}
