import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../verify/route';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/auth/me - Get current user session
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('clawdnet_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = getSession(sessionToken);
    if (!session) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('clawdnet_session');
      return response;
    }

    // Try to get full user info from DB
    const db = getDb();
    let user: any = null;

    if (db && !session.userId.startsWith('mock_')) {
      try {
        const [dbUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .limit(1);

        if (dbUser) {
          user = {
            id: dbUser.id,
            handle: dbUser.handle,
            name: dbUser.name,
            email: dbUser.email,
            avatarUrl: dbUser.avatarUrl,
            isVerified: dbUser.isVerified,
            createdAt: dbUser.createdAt?.toISOString(),
          };
        }
      } catch (dbError) {
        console.error('DB error fetching user:', dbError);
      }
    }

    // Fallback to session data
    if (!user) {
      user = {
        id: session.userId,
        handle: `user_${session.address.slice(2, 10)}`,
        address: session.address,
      };
    }

    return NextResponse.json({
      authenticated: true,
      user,
      address: session.address,
      expiresAt: session.expiresAt,
    });

  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
}
