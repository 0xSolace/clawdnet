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
    response.cookies.delete('clawdnet_session');
    
    return response;

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
