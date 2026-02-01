/**
 * Example: x402 Protected API Route
 * 
 * This demonstrates how to use withPaymentRequired to protect an endpoint.
 * Clients must pay via x402 protocol to access this endpoint.
 * 
 * Flow:
 * 1. Client calls endpoint without payment → 402 response with payment details
 * 2. Client pays via Base USDC to the specified wallet
 * 3. Client retries with X-Payment header containing payment proof
 * 4. Server verifies payment and returns the protected resource
 * 
 * @see https://github.com/coinbase/x402
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPaymentRequired, verifyPayment } from '@/lib/x402';

// The receiver wallet - in production, fetch this from the agent's profile
const RECEIVER_WALLET = process.env.X402_RECEIVER_WALLET || '0x0000000000000000000000000000000000000000';

/**
 * GET /api/x402-example
 * A simple protected endpoint that returns a message after payment
 */
async function handler(request: NextRequest): Promise<NextResponse> {
  // If we get here, payment was verified by the middleware
  // The actual handler logic goes here
  
  return NextResponse.json({
    success: true,
    message: 'Payment verified! Here is your protected content.',
    timestamp: new Date().toISOString(),
    tip: 'This endpoint required $0.01 USDC on Base to access.',
  });
}

// Wrap with x402 payment protection
// This will return 402 if no valid payment, or call handler if payment verified
export const GET = withPaymentRequired(handler, {
  payTo: RECEIVER_WALLET,
  amountUsd: 0.01, // $0.01 USDC
  description: 'Example API access fee',
});

/**
 * POST /api/x402-example
 * Example with dynamic pricing based on input
 */
export async function POST(request: NextRequest) {
  // Check for payment header
  const paymentHeader = request.headers.get('X-Payment') || request.headers.get('payment-signature');
  
  if (!paymentHeader) {
    // Return 402 with payment requirements
    const body = await request.json().catch(() => ({}));
    const complexity = body.complexity || 'low';
    
    // Dynamic pricing based on complexity
    const prices: Record<string, number> = {
      low: 0.01,
      medium: 0.05,
      high: 0.10,
    };
    
    const price = prices[complexity] || 0.01;
    
    return NextResponse.json({
      error: 'Payment Required',
      x402Version: 1,
      accepts: [{
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: (price * 1e6).toString(), // Convert to USDC units (6 decimals)
        resource: '/api/x402-example',
        description: `${complexity} complexity processing`,
        mimeType: 'application/json',
        payTo: RECEIVER_WALLET,
        maxTimeoutSeconds: 3600,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
      }],
    }, { status: 402 });
  }
  
  // Verify the payment
  const verification = await verifyPayment(request);
  
  if (!verification.valid) {
    return NextResponse.json({
      error: 'Payment verification failed',
      details: verification.error,
    }, { status: 402 });
  }
  
  // Payment verified - process the request
  const body = await request.json().catch(() => ({}));
  
  return NextResponse.json({
    success: true,
    message: 'Payment verified! Processing your request.',
    input: body,
    payment: {
      payer: verification.payer,
      txHash: verification.txHash,
    },
    timestamp: new Date().toISOString(),
  });
}
