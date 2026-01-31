import { NextRequest, NextResponse } from 'next/server';

// In-memory challenge store (use Redis in production)
const challenges = new Map<string, { nonce: string; expiresAt: number }>();

// Cleanup expired challenges periodically
function cleanupChallenges() {
  const now = Date.now();
  for (const [address, challenge] of challenges.entries()) {
    if (challenge.expiresAt < now) {
      challenges.delete(address);
    }
  }
}

// POST /api/auth/challenge - Get a challenge nonce for wallet signing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase();

    // Generate nonce
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store challenge
    challenges.set(normalizedAddress, { nonce, expiresAt });

    // Cleanup old challenges
    cleanupChallenges();

    // Create SIWE-style message
    const message = `Sign this message to authenticate with ClawdNet.

Address: ${address}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}
Expiration Time: ${new Date(expiresAt).toISOString()}

URI: https://clawdnet.xyz
Chain ID: 8453`;

    return NextResponse.json({
      message,
      nonce,
      expiresAt,
    });

  } catch (error) {
    console.error('Error generating challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}

// Export for verification endpoint
export function getChallenge(address: string): { nonce: string; expiresAt: number } | null {
  const normalizedAddress = address.toLowerCase();
  const challenge = challenges.get(normalizedAddress);
  
  if (!challenge || challenge.expiresAt < Date.now()) {
    challenges.delete(normalizedAddress);
    return null;
  }
  
  return challenge;
}

export function clearChallenge(address: string) {
  challenges.delete(address.toLowerCase());
}
