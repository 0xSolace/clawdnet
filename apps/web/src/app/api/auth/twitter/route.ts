import { NextRequest, NextResponse } from 'next/server';
import { getTwitterAuthUrl } from '@/lib/twitter-auth';

/**
 * GET /api/auth/twitter
 * 
 * Initiates Twitter OAuth flow. Redirects the user to Twitter's authorization page.
 * 
 * Query params:
 * - claim_code: Optional. If present, the user will be redirected to claim an agent after login.
 * - redirect_to: Optional. URL to redirect to after successful auth.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const claimCode = searchParams.get('claim_code') || undefined;
    const redirectTo = searchParams.get('redirect_to') || undefined;

    // Check if Twitter OAuth is configured
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      console.error('Twitter OAuth not configured');
      return NextResponse.json(
        { error: 'Twitter OAuth is not configured' },
        { status: 500 }
      );
    }

    // Generate authorization URL with PKCE
    const { url } = getTwitterAuthUrl({
      claimCode,
      redirectTo,
    });

    // Redirect to Twitter
    return NextResponse.redirect(url);

  } catch (error) {
    console.error('Error initiating Twitter OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter login' },
      { status: 500 }
    );
  }
}
