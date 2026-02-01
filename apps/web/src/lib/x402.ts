/**
 * x402 Payment Protocol Integration for ClawdNet
 * 
 * Uses HTTP 402 Payment Required for agent-to-agent crypto payments.
 * Built on Base network with USDC via Coinbase facilitator.
 * 
 * @see https://github.com/coinbase/x402
 */

import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm';
import { withX402 } from '@x402/next';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { NextRequest, NextResponse } from 'next/server';

// Base USDC contract address
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Coinbase x402 facilitator URL
export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.coinbase.com';

// Platform fee percentage for x402 payments (5%)
export const X402_PLATFORM_FEE_PERCENT = 5;

// Platform wallet address for receiving fees
export const X402_PLATFORM_WALLET = process.env.X402_PLATFORM_WALLET || '0x0000000000000000000000000000000000000000';

// Network identifier for Base
export const X402_NETWORK = 'base';

// ============================================================================
// Viem Clients
// ============================================================================

/**
 * Public client for reading from Base
 */
export const basePublicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Create a wallet client for signing transactions
 */
export function createAgentWalletClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(),
  });
}

// ============================================================================
// x402 Server Setup
// ============================================================================

let _resourceServer: x402ResourceServer | null = null;
let _facilitatorClient: HTTPFacilitatorClient | null = null;

/**
 * Get or create the x402 resource server
 */
export function getX402ResourceServer(): x402ResourceServer {
  if (!_resourceServer) {
    _facilitatorClient = new HTTPFacilitatorClient(X402_FACILITATOR_URL);
    _resourceServer = new x402ResourceServer(_facilitatorClient);
    
    // Register EVM scheme for Base
    const evmScheme = new ExactEvmScheme();
    _resourceServer.register(X402_NETWORK, evmScheme);
  }
  return _resourceServer;
}

/**
 * Get the facilitator client
 */
export function getFacilitatorClient(): HTTPFacilitatorClient {
  if (!_facilitatorClient) {
    getX402ResourceServer(); // Initialize
  }
  return _facilitatorClient!;
}

// ============================================================================
// Payment Requirements
// ============================================================================

export interface X402PaymentRequirement {
  network: string;
  asset: string;
  amount: string; // In smallest unit (e.g., USDC has 6 decimals)
  receiver: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create x402 payment requirements for an agent skill
 */
export function createPaymentRequirements(params: {
  receiverWallet: string;
  amountUsd: number;
  description?: string;
  skillId?: string;
  agentHandle?: string;
}): X402PaymentRequirement {
  const { receiverWallet, amountUsd, description, skillId, agentHandle } = params;
  
  // Convert USD to USDC (6 decimals)
  const amountUsdc = parseUnits(amountUsd.toString(), 6).toString();
  
  return {
    network: X402_NETWORK,
    asset: BASE_USDC_ADDRESS,
    amount: amountUsdc,
    receiver: receiverWallet,
    description: description || `Payment to ${agentHandle || 'agent'}`,
    metadata: {
      skillId,
      agentHandle,
      timestamp: Date.now(),
    },
  };
}

/**
 * Create a 402 response with payment requirements
 */
export function create402Response(requirements: X402PaymentRequirement): Response {
  const paymentDetails = {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: requirements.network,
        maxAmountRequired: requirements.amount,
        resource: requirements.receiver,
        description: requirements.description,
        mimeType: 'application/json',
        payTo: requirements.receiver,
        maxTimeoutSeconds: 3600,
        asset: requirements.asset,
        extra: requirements.metadata,
      },
    ],
  };

  return new Response(JSON.stringify({
    error: 'Payment Required',
    message: requirements.description,
    paymentDetails,
  }), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Details': JSON.stringify(paymentDetails),
      'WWW-Authenticate': `X-Payment realm="ClawdNet", version="1"`,
    },
  });
}

// ============================================================================
// Route Configuration for x402
// ============================================================================

export interface X402RouteConfig {
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  description?: string;
}

/**
 * Create route configuration for x402 middleware
 */
export function createRouteConfig(params: {
  receiverWallet: string;
  amountUsd: number;
  description?: string;
}): X402RouteConfig {
  const amountUsdc = parseUnits(params.amountUsd.toString(), 6).toString();
  
  return {
    network: X402_NETWORK,
    asset: BASE_USDC_ADDRESS,
    payTo: params.receiverWallet,
    maxAmountRequired: amountUsdc,
    description: params.description,
  };
}

// ============================================================================
// Payment Verification
// ============================================================================

export interface X402VerifyResult {
  valid: boolean;
  payer?: string;
  amount?: string;
  txHash?: string;
  error?: string;
}

/**
 * Verify an x402 payment signature from request headers
 */
export async function verifyPayment(request: NextRequest): Promise<X402VerifyResult> {
  const paymentHeader = request.headers.get('X-Payment') || request.headers.get('payment-signature');
  
  if (!paymentHeader) {
    return { valid: false, error: 'No payment header found' };
  }

  try {
    // Parse the payment payload
    const paymentPayload = JSON.parse(paymentHeader);
    
    // Get the resource server
    const server = getX402ResourceServer();
    
    // Verify the payment using the facilitator
    const facilitator = getFacilitatorClient();
    const result = await facilitator.verify({
      paymentPayload,
      paymentRequirements: paymentPayload.requirements,
    });

    if (result.valid) {
      return {
        valid: true,
        payer: paymentPayload.payer,
        amount: paymentPayload.amount,
        txHash: result.settlementDetails?.txHash,
      };
    }

    return { valid: false, error: result.invalidReason || 'Payment verification failed' };
  } catch (error) {
    console.error('x402 payment verification error:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Verification error' 
    };
  }
}

// ============================================================================
// On-Chain Balance & History
// ============================================================================

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
  },
] as const;

/**
 * Get USDC balance for a wallet on Base
 */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const balance = await basePublicClient.readContract({
      address: BASE_USDC_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });
    
    // USDC has 6 decimals
    return parseFloat(formatUnits(balance, 6));
  } catch (error) {
    console.error('Failed to get USDC balance:', error);
    return 0;
  }
}

/**
 * Get recent USDC transfer events to a wallet
 */
export async function getRecentTransfers(
  walletAddress: string, 
  limit = 20
): Promise<{
  from: string;
  to: string;
  amount: number;
  txHash: string;
  blockNumber: bigint;
}[]> {
  try {
    // Get recent blocks (last ~1000 blocks ≈ 30 minutes on Base)
    const currentBlock = await basePublicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(1000);
    
    const logs = await basePublicClient.getLogs({
      address: BASE_USDC_ADDRESS as `0x${string}`,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { indexed: true, name: 'from', type: 'address' },
          { indexed: true, name: 'to', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' },
        ],
      },
      args: {
        to: walletAddress as `0x${string}`,
      },
      fromBlock,
      toBlock: currentBlock,
    });

    return logs
      .slice(-limit)
      .reverse()
      .map((log) => ({
        from: log.args.from as string,
        to: log.args.to as string,
        amount: parseFloat(formatUnits(log.args.value as bigint, 6)),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }));
  } catch (error) {
    console.error('Failed to get recent transfers:', error);
    return [];
  }
}

// ============================================================================
// Middleware Wrapper
// ============================================================================

export type X402HandlerOptions = {
  receiverWallet: string;
  amountUsd: number;
  description?: string;
};

/**
 * Wrap a Next.js API route handler with x402 payment protection
 * 
 * @example
 * ```ts
 * export const POST = withPaymentRequired(
 *   async (req) => {
 *     // Handler only runs after payment verified
 *     return NextResponse.json({ result: 'success' });
 *   },
 *   {
 *     receiverWallet: '0x...',
 *     amountUsd: 0.01,
 *     description: 'API call fee'
 *   }
 * );
 * ```
 */
export function withPaymentRequired(
  handler: (request: NextRequest) => Promise<Response>,
  options: X402HandlerOptions
) {
  const routeConfig = createRouteConfig(options);
  const server = getX402ResourceServer();
  
  return withX402(
    handler,
    {
      scheme: 'exact',
      network: routeConfig.network,
      maxAmountRequired: routeConfig.maxAmountRequired,
      resource: routeConfig.payTo,
      description: routeConfig.description,
      mimeType: 'application/json',
      payTo: routeConfig.payTo,
      maxTimeoutSeconds: 3600,
      asset: routeConfig.asset,
    },
    server,
    undefined, // paywallConfig
    undefined, // paywall provider
    true // syncFacilitatorOnStart
  );
}

// ============================================================================
// Dynamic Pricing
// ============================================================================

/**
 * Create x402 requirements with dynamic pricing based on skill
 */
export async function createDynamicPaymentRequirements(params: {
  agentWallet: string;
  skillId: string;
  basePrice: number;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<X402PaymentRequirement> {
  const { agentWallet, skillId, basePrice, inputTokens = 0, outputTokens = 0 } = params;
  
  // Simple pricing: base + token costs
  const inputCost = inputTokens * 0.000001; // $0.001 per 1000 input tokens
  const outputCost = outputTokens * 0.000002; // $0.002 per 1000 output tokens
  const totalPrice = basePrice + inputCost + outputCost;
  
  return createPaymentRequirements({
    receiverWallet: agentWallet,
    amountUsd: totalPrice,
    description: `${skillId} service`,
    skillId,
  });
}

// ============================================================================
// Helper Types
// ============================================================================

export type PaymentMethod = 'x402' | 'stripe' | 'both';

export interface AgentPaymentConfig {
  x402Enabled: boolean;
  stripeEnabled: boolean;
  preferredMethod: PaymentMethod;
  walletAddress?: string;
  stripeAccountId?: string;
}

/**
 * Get payment configuration for an agent
 */
export function getAgentPaymentConfig(agent: {
  x402Support?: boolean;
  agentWallet?: string | null;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
}): AgentPaymentConfig {
  const x402Enabled = !!(agent.x402Support && agent.agentWallet);
  const stripeEnabled = !!(agent.stripeAccountId && agent.stripeOnboardingComplete);
  
  let preferredMethod: PaymentMethod = 'stripe';
  if (x402Enabled && stripeEnabled) {
    preferredMethod = 'both';
  } else if (x402Enabled) {
    preferredMethod = 'x402';
  }
  
  return {
    x402Enabled,
    stripeEnabled,
    preferredMethod,
    walletAddress: agent.agentWallet || undefined,
    stripeAccountId: agent.stripeAccountId || undefined,
  };
}

export default {
  getX402ResourceServer,
  getFacilitatorClient,
  createPaymentRequirements,
  create402Response,
  verifyPayment,
  getUsdcBalance,
  getRecentTransfers,
  withPaymentRequired,
  createDynamicPaymentRequirements,
  getAgentPaymentConfig,
  BASE_USDC_ADDRESS,
  X402_NETWORK,
};
