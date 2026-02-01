import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getTwitterUser } from '@/lib/twitter-auth';
import { supabase } from '@/lib/db/supabase';

/**
 * GET /api/auth/twitter/callback
 * 
 * Handles the OAuth callback from Twitter.
 * - Exchanges the authorization code for tokens
 * - Fetches the user's Twitter profile
 * - Creates or updates the user in the database
 * - If there's a claim_code, claims the agent for this user
 * - Sets session cookie and redirects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clawdnet.xyz';

    // Handle OAuth errors
    if (error) {
      console.error('Twitter OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/claim/error?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/claim/error?error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Exchange code for tokens
    const { tokens, stateData } = await exchangeCodeForTokens(code, state);
    const { claimCode, redirectTo } = stateData;

    // Fetch Twitter user profile
    const twitterUser = await getTwitterUser(tokens.access_token);

    console.log('Twitter user authenticated:', {
      id: twitterUser.id,
      username: twitterUser.username,
      name: twitterUser.name,
    });

    // Find or create user
    let userId: string;
    let isNewUser = false;

    // Check if user exists with this Twitter ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, handle, name, twitter_id')
      .eq('twitter_id', twitterUser.id)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      
      // Update Twitter info
      await supabase
        .from('users')
        .update({
          twitter_handle: twitterUser.username,
          twitter_avatar: twitterUser.profile_image_url?.replace('_normal', '_400x400'), // Get larger image
          name: existingUser.name || twitterUser.name, // Don't override if already set
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    } else {
      isNewUser = true;
      
      // Create new user with Twitter info
      const handle = `${twitterUser.username.toLowerCase()}`;
      
      // Check if handle is taken (by non-Twitter user)
      const { data: handleCheck } = await supabase
        .from('users')
        .select('id')
        .eq('handle', handle)
        .single();

      const finalHandle = handleCheck ? `${handle}_tw` : handle;

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          handle: finalHandle,
          name: twitterUser.name,
          twitter_id: twitterUser.id,
          twitter_handle: twitterUser.username,
          twitter_avatar: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
          avatar_url: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
          bio: twitterUser.description,
          auth_provider: 'twitter',
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        console.error('Failed to create user:', createError);
        return NextResponse.redirect(
          `${baseUrl}/claim/error?error=${encodeURIComponent('Failed to create user account')}`
        );
      }

      userId = newUser.id;

      // Award early adopter badge for new Twitter signups
      // Use upsert to avoid duplicates
      try {
        await supabase.from('badges').upsert({
          user_id: userId,
          badge_id: 'twitter_verified',
        }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
      } catch (badgeError) {
        // Ignore badge errors - not critical
        console.warn('Failed to award badge:', badgeError);
      }
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Store session in database or use the existing in-memory store
    // For now, we'll set the cookie with user info
    // In production, use a proper session store

    // If there's a claim code, claim the agent
    if (claimCode) {
      const claimResult = await claimAgent(claimCode, userId);
      
      if (claimResult.error) {
        console.error('Failed to claim agent:', claimResult.error);
        // Still redirect to claim page, they can try again
      }
    }

    // Determine redirect URL
    let redirectUrl: string;
    if (claimCode) {
      redirectUrl = `${baseUrl}/claim/${claimCode}`;
    } else if (redirectTo) {
      redirectUrl = redirectTo.startsWith('/') ? `${baseUrl}${redirectTo}` : redirectTo;
    } else {
      redirectUrl = `${baseUrl}/dashboard`;
    }

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie
    response.cookies.set('clawdnet_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Store session data in a separate cookie (encrypted in production)
    response.cookies.set('clawdnet_user', JSON.stringify({
      id: userId,
      twitterId: twitterUser.id,
      twitterHandle: twitterUser.username,
      name: twitterUser.name,
      avatar: twitterUser.profile_image_url,
      authProvider: 'twitter',
      expiresAt,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error in Twitter callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clawdnet.xyz';
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    return NextResponse.redirect(
      `${baseUrl}/claim/error?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

/**
 * Claim an agent for a user
 */
async function claimAgent(claimCode: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find agent by claim code
    const { data: agent, error: findError } = await supabase
      .from('agents')
      .select('id, handle, name, owner_id')
      .eq('claim_code', claimCode)
      .single();

    if (findError || !agent) {
      return { success: false, error: 'Invalid claim code' };
    }

    // Check if already claimed
    if (agent.owner_id) {
      // Check if claimed by the same user
      if (agent.owner_id === userId) {
        return { success: true }; // Already owned by this user
      }
      return { success: false, error: 'Agent already claimed by another user' };
    }

    // Claim the agent
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        owner_id: userId,
        status: 'online',
        is_public: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Failed to update agent:', updateError);
      return { success: false, error: 'Failed to claim agent' };
    }

    // Create feed event
    await supabase.from('feed_events').insert({
      actor_id: agent.id,
      actor_type: 'agent',
      event_type: 'agent_claimed',
      message: `Agent @${agent.handle} was claimed`,
      data: { userId },
    });

    return { success: true };

  } catch (error) {
    console.error('Error claiming agent:', error);
    return { success: false, error: 'Failed to claim agent' };
  }
}
