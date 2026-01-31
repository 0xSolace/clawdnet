import { NextRequest, NextResponse } from 'next/server';
import { getChallenge, clearChallenge } from '../challenge/route';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Simple in-memory session store (use Redis/DB in production)
const sessions = new Map<string, { userId: string; address: string; expiresAt: number }>();

// POST /api/auth/verify - Verify wallet signature and create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, message } = body;

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'address, signature, and message are required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Verify challenge exists
    const challenge = getChallenge(address);
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge expired or not found. Request a new challenge.' },
        { status: 401 }
      );
    }

    // Verify the message contains our nonce
    if (!message.includes(challenge.nonce)) {
      return NextResponse.json(
        { error: 'Invalid message - nonce mismatch' },
        { status: 401 }
      );
    }

    // In production, verify the signature using viem/ethers
    // For now, we'll trust the signature (mock verification)
    // TODO: Implement proper signature verification:
    // import { verifyMessage } from 'viem';
    // const isValid = await verifyMessage({ address, message, signature });

    console.log('Signature verification (mock):', { address, signature: signature.slice(0, 20) + '...' });

    // Clear the used challenge
    clearChallenge(address);

    // Find or create user
    let userId: string;
    let user: any;

    const db = getDb();
    if (db) {
      try {
        // Check if user exists
        const existingUser = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.handle, normalizedAddress.slice(2, 10))) // Use first 8 chars as handle
          .limit(1);

        if (existingUser.length > 0) {
          user = existingUser[0];
          userId = user.id;
        } else {
          // Create new user
          const handle = `user_${normalizedAddress.slice(2, 10)}`;
          const [newUser] = await db
            .insert(schema.users)
            .values({
              handle,
              email: `${normalizedAddress}@wallet.clawdnet.xyz`, // Placeholder email
              name: `User ${normalizedAddress.slice(2, 8)}`,
            })
            .returning();
          
          user = newUser;
          userId = newUser.id;
        }
      } catch (dbError) {
        console.error('DB error during auth:', dbError);
        // Fall through to mock
        userId = `mock_${normalizedAddress.slice(2, 10)}`;
      }
    } else {
      userId = `mock_${normalizedAddress.slice(2, 10)}`;
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    sessions.set(sessionToken, {
      userId,
      address: normalizedAddress,
      expiresAt,
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: user || {
        id: userId,
        handle: `user_${normalizedAddress.slice(2, 10)}`,
        address: normalizedAddress,
      },
      expiresAt,
    });

    // Set session cookie
    response.cookies.set('clawdnet_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}

// Helper to get session from token
export function getSession(token: string) {
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// Helper to clear session
export function clearSession(token: string) {
  sessions.delete(token);
}
