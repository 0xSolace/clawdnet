import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '../verify/route';

// POST /api/auth/logout - Clear session
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('clawdnet_session')?.value;

    if (sessionToken) {
      clearSession(sessionToken);
    }

    const response = NextResponse.json({ success: true });
    
    // Clear all auth cookies
    response.cookies.delete('clawdnet_session');
    response.cookies.delete('clawdnet_user');
    
    return response;

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

// Also support GET for easy logout links
export async function GET(request: NextRequest) {
  return POST(request);
}
