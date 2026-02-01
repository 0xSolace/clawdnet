/**
 * x402 Payment Protocol Integration for ClawdNet
 * 
 * Uses HTTP 402 Payment Required for agent-to-agent crypto payments.
 * Built on Base network with USDC via Coinbase facilitator.
 * 
 * @see https://github.com/coinbase/x402
 */

import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Base USDC contract address
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Coinbase x402 facilitator URL
export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.coinbase.com';

// Platform fee percentage for x402 payments (5%)
export const X402_PLATFORM_FEE_PERCENT = 5;

// Platform wallet address for receiving fees
export const X402_PLATFORM_WALLET = process.env.X402_PLATFORM_WALLET || '0x0000000000000000000000000000000000000000';

// Network identifier for Base
export const X402_NETWORK = 'base:8453' as const;

// USDC has 6 decimals
const USDC_DECIMALS = 6;

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
// Payment Requirements
// ============================================================================

export interface X402PaymentRequirement {
  network: string;
  scheme: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

/**
 * Create payment requirements for x402 response
 */
export function createPaymentRequirements(options: {
  amountUsd: number;
  payTo: string;
  description: string;
  resource?: string;
}): X402PaymentRequirement {
  // Convert USD amount to USDC (6 decimals)
  const amountUsdc = Math.floor(options.amountUsd * Math.pow(10, USDC_DECIMALS)).toString();
  
  return {
    network: X402_NETWORK,
    scheme: 'exact',
    maxAmountRequired: amountUsdc,
    resource: options.resource || options.payTo,
    description: options.description,
    mimeType: 'application/json',
    payTo: options.payTo,
    maxTimeoutSeconds: 3600,
    asset: `eip155:8453/erc20:${BASE_USDC_ADDRESS}`,
  };
}

/**
 * Create a 402 Payment Required response
 */
export function create402Response(requirements: X402PaymentRequirement, message?: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Payment Required',
      message: message || 'This resource requires payment',
      paymentRequirements: [requirements],
      x402Version: 2,
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Requirements': JSON.stringify([requirements]),
      },
    }
  );
}

// ============================================================================
// Payment Verification
// ============================================================================

export interface X402PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: unknown;
  payer: string;
  amount: string;
  requirements: X402PaymentRequirement[];
}

export interface VerifyResult {
  valid: boolean;
  payer?: string;
  amount?: string;
  txHash?: string;
  error?: string;
}

/**
 * Verify an x402 payment from request headers
 */
export async function verifyPayment(request: NextRequest): Promise<VerifyResult> {
  try {
    const paymentHeader = request.headers.get('X-Payment');
    if (!paymentHeader) {
      return { valid: false, error: 'No payment header found' };
    }

    const paymentPayload: X402PaymentPayload = JSON.parse(paymentHeader);
    
    // Verify with Coinbase facilitator
    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements: paymentPayload.requirements,
      }),
    });

    if (!response.ok) {
      return { valid: false, error: `Facilitator error: ${response.status}` };
    }

    const result = await response.json();
    
    if (result.isValid) {
      return {
        valid: true,
        payer: paymentPayload.payer,
        amount: paymentPayload.amount,
        txHash: result.txHash,
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

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Get USDC balance for an address on Base
 */
export async function getUsdcBalance(address: string): Promise<{
  balance: string;
  balanceFormatted: string;
}> {
  try {
    const balance = await basePublicClient.readContract({
      address: BASE_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return {
      balance: balance.toString(),
      balanceFormatted: formatUnits(balance, USDC_DECIMALS),
    };
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return { balance: '0', balanceFormatted: '0' };
  }
}

export interface TransferEvent {
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
  transactionHash: string;
  blockNumber: bigint;
}

/**
 * Get recent USDC transfers to an address
 */
export async function getRecentTransfers(
  address: string,
  limit: number = 10
): Promise<TransferEvent[]> {
  try {
    const currentBlock = await basePublicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(10000); // ~10k blocks back

    const logs = await basePublicClient.getLogs({
      address: BASE_USDC_ADDRESS,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false },
        ],
      },
      args: {
        to: address as `0x${string}`,
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
        value: (log.args.value as bigint).toString(),
        valueFormatted: formatUnits(log.args.value as bigint, USDC_DECIMALS),
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }));
  } catch (error) {
    console.error('Error fetching transfer events:', error);
    return [];
  }
}

// ============================================================================
// Middleware
// ============================================================================

interface PaymentRequiredOptions {
  amountUsd: number;
  payTo: string;
  description: string;
}

/**
 * Create a route config for x402 protected routes
 */
function createRouteConfig(options: PaymentRequiredOptions) {
  return {
    network: X402_NETWORK,
    payTo: options.payTo,
    description: options.description,
    maxAmountRequired: Math.floor(options.amountUsd * Math.pow(10, USDC_DECIMALS)).toString(),
    asset: `eip155:8453/erc20:${BASE_USDC_ADDRESS}`,
  };
}

/**
 * Middleware wrapper for x402 protected routes
 * Checks for valid payment and returns 402 if not present
 */
export function withPaymentRequired(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: PaymentRequiredOptions
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // Check for payment header
    const hasPayment = request.headers.has('X-Payment');
    
    if (!hasPayment) {
      const requirements = createPaymentRequirements(options);
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: options.description,
          paymentRequirements: [requirements],
          x402Version: 2,
        },
        { 
          status: 402,
          headers: {
            'X-Payment-Requirements': JSON.stringify([requirements]),
          },
        }
      );
    }

    // Verify payment
    const verification = await verifyPayment(request);
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Payment Invalid', message: verification.error },
        { status: 402 }
      );
    }

    // Payment valid - proceed with handler
    return handler(request);
  };
}

// ============================================================================
// Dynamic Pricing
// ============================================================================

/**
 * Create x402 requirements with dynamic pricing based on skill
 */
export function createDynamicPricing(skill: {
  name: string;
  rate: number;
  unit: string;
}, payTo: string): X402PaymentRequirement {
  return createPaymentRequirements({
    amountUsd: skill.rate,
    payTo,
    description: `${skill.name} - ${skill.rate} ${skill.unit}`,
  });
}

// ============================================================================
// Agent Payment Config
// ============================================================================

export interface AgentPaymentConfig {
  x402Support: boolean;
  agentWallet: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
}

/**
 * Check if agent has x402 payments enabled
 */
export function getAgentPaymentConfig(agent: {
  x402_support?: boolean;
  agent_wallet?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean;
}): AgentPaymentConfig {
  return {
    x402Support: agent.x402_support ?? false,
    agentWallet: agent.agent_wallet ?? null,
    stripeAccountId: agent.stripe_account_id ?? null,
    stripeOnboardingComplete: agent.stripe_onboarding_complete ?? false,
  };
}
