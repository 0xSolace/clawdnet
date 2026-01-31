import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../verify/route';
import { supabase } from '@/lib/db/supabase';

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

    // Try to get full user info from Supabase
    let user: any = null;

    if (!session.userId.startsWith('mock_')) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, handle, name, email, avatar_url, is_verified, wallet_address, created_at')
          .eq('id', session.userId)
          .single();

        if (dbUser) {
          user = {
            id: dbUser.id,
            handle: dbUser.handle,
            name: dbUser.name,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url,
            isVerified: dbUser.is_verified,
            walletAddress: dbUser.wallet_address,
            createdAt: dbUser.created_at,
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
