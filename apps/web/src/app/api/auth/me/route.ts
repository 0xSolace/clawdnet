import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../verify/route';
import { supabase } from '@/lib/db/supabase';

interface TwitterSessionData {
  id: string;
  twitterId: string;
  twitterHandle: string;
  name: string;
  avatar: string;
  authProvider: string;
  expiresAt: number;
}

// GET /api/auth/me - Get current user session
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('clawdnet_session')?.value;
    const twitterUserCookie = request.cookies.get('clawdnet_user')?.value;

    // Check for Twitter session first
    if (twitterUserCookie) {
      try {
        const twitterSession: TwitterSessionData = JSON.parse(twitterUserCookie);
        
        // Check if session is still valid
        if (twitterSession.expiresAt > Date.now()) {
          // Fetch full user from database
          const { data: dbUser } = await supabase
            .from('users')
            .select(`
              id, handle, name, email, avatar_url, bio,
              is_verified, wallet_address, 
              twitter_id, twitter_handle, twitter_avatar, auth_provider,
              created_at, updated_at
            `)
            .eq('id', twitterSession.id)
            .single();

          if (dbUser) {
            return NextResponse.json({
              authenticated: true,
              user: {
                id: dbUser.id,
                handle: dbUser.handle,
                name: dbUser.name,
                email: dbUser.email,
                bio: dbUser.bio,
                avatarUrl: dbUser.avatar_url || dbUser.twitter_avatar,
                isVerified: dbUser.is_verified,
                walletAddress: dbUser.wallet_address,
                twitterId: dbUser.twitter_id,
                twitterHandle: dbUser.twitter_handle,
                twitterAvatar: dbUser.twitter_avatar,
                authProvider: dbUser.auth_provider,
                createdAt: dbUser.created_at,
                updatedAt: dbUser.updated_at,
              },
              authProvider: 'twitter',
              expiresAt: twitterSession.expiresAt,
            });
          }
        }
      } catch (parseError) {
        console.error('Failed to parse Twitter session:', parseError);
        // Continue to check wallet session
      }
    }

    // Fall back to wallet session
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = getSession(sessionToken);
    if (!session) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('clawdnet_session');
      response.cookies.delete('clawdnet_user');
      return response;
    }

    // Try to get full user info from Supabase
    let user: any = null;

    if (!session.userId.startsWith('mock_')) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select(`
            id, handle, name, email, avatar_url, bio,
            is_verified, wallet_address,
            twitter_id, twitter_handle, twitter_avatar, auth_provider,
            created_at, updated_at
          `)
          .eq('id', session.userId)
          .single();

        if (dbUser) {
          user = {
            id: dbUser.id,
            handle: dbUser.handle,
            name: dbUser.name,
            email: dbUser.email,
            bio: dbUser.bio,
            avatarUrl: dbUser.avatar_url,
            isVerified: dbUser.is_verified,
            walletAddress: dbUser.wallet_address,
            twitterId: dbUser.twitter_id,
            twitterHandle: dbUser.twitter_handle,
            twitterAvatar: dbUser.twitter_avatar,
            authProvider: dbUser.auth_provider || 'wallet',
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
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
        walletAddress: session.address,
        authProvider: 'wallet',
      };
    }

    return NextResponse.json({
      authenticated: true,
      user,
      address: session.address,
      authProvider: user.authProvider || 'wallet',
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
