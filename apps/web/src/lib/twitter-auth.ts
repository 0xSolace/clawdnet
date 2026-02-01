/**
 * Twitter OAuth 2.0 with PKCE support for ClawdNet
 * 
 * This implements the OAuth 2.0 Authorization Code flow with PKCE
 * for secure Twitter login without exposing client secrets on the client side.
 */

import crypto from 'crypto';

// Twitter OAuth 2.0 endpoints
const TWITTER_AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_USER_URL = 'https://api.twitter.com/2/users/me';

// Required scopes for reading user profile
const SCOPES = ['tweet.read', 'users.read', 'offline.access'];

// In-memory store for PKCE verifiers (use Redis in production)
const codeVerifiers = new Map<string, { verifier: string; expiresAt: number }>();

// Clean up expired verifiers periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of codeVerifiers) {
    if (data.expiresAt < now) {
      codeVerifiers.delete(state);
    }
  }
}, 60000);

/**
 * Generate a cryptographically secure random string for PKCE
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from verifier (S256 method)
 */
function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface TwitterAuthUrlOptions {
  /** Optional claim code to include in state for agent claiming */
  claimCode?: string;
  /** Optional redirect after auth */
  redirectTo?: string;
}

export interface TwitterAuthUrlResult {
  url: string;
  state: string;
}

/**
 * Generate the Twitter OAuth authorization URL
 */
export function getTwitterAuthUrl(options?: TwitterAuthUrlOptions): TwitterAuthUrlResult {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const callbackUrl = process.env.TWITTER_CALLBACK_URL || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://clawdnet.xyz'}/api/auth/twitter/callback`;

  if (!clientId) {
    throw new Error('TWITTER_CLIENT_ID not configured');
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store verifier with state (expires in 10 minutes)
  const stateData = {
    verifier: codeVerifier,
    claimCode: options?.claimCode,
    redirectTo: options?.redirectTo,
  };
  
  codeVerifiers.set(state, {
    verifier: JSON.stringify(stateData),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `${TWITTER_AUTHORIZE_URL}?${params.toString()}`,
    state,
  };
}

export interface TwitterTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<{ tokens: TwitterTokens; stateData: { claimCode?: string; redirectTo?: string } }> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const callbackUrl = process.env.TWITTER_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://clawdnet.xyz'}/api/auth/twitter/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth not configured');
  }

  // Retrieve and validate state/verifier
  const stored = codeVerifiers.get(state);
  if (!stored || stored.expiresAt < Date.now()) {
    codeVerifiers.delete(state);
    throw new Error('Invalid or expired state');
  }

  const stateData = JSON.parse(stored.verifier);
  const codeVerifier = stateData.verifier;

  // Remove used state
  codeVerifiers.delete(state);

  // Exchange code for tokens
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twitter token exchange failed:', error);
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const tokens = await response.json() as TwitterTokens;
  
  return {
    tokens,
    stateData: {
      claimCode: stateData.claimCode,
      redirectTo: stateData.redirectTo,
    },
  };
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

/**
 * Fetch the authenticated user's Twitter profile
 */
export async function getTwitterUser(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(`${TWITTER_USER_URL}?user.fields=profile_image_url,description,verified,public_metrics`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch Twitter user:', error);
    throw new Error('Failed to fetch Twitter user profile');
  }

  const data = await response.json();
  return data.data as TwitterUser;
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshTwitterToken(refreshToken: string): Promise<TwitterTokens> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth not configured');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Validate that a state parameter is valid and not expired
 */
export function isValidState(state: string): boolean {
  const stored = codeVerifiers.get(state);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    codeVerifiers.delete(state);
    return false;
  }
  return true;
}
