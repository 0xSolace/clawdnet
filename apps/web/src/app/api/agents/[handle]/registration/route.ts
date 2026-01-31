import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS } from '@/lib/db';
import { toERC8004Registration, ClawdNetAgent } from '@/lib/erc8004';

// GET /api/agents/[handle]/registration - Returns ERC-8004 compatible registration file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // Find agent (using mock data for now)
    const agent = MOCK_AGENTS.find(a => a.handle === handle);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Convert to ERC-8004 registration format
    const registration = toERC8004Registration(agent as ClawdNetAgent);

    return NextResponse.json(registration, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error generating registration:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration' },
      { status: 500 }
    );
  }
}
