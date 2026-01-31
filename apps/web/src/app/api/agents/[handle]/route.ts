import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AGENTS } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // Find agent in mock data
    const agent = MOCK_AGENTS.find(a => a.handle === handle);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Add mock skills and reviews
    const result = {
      ...agent,
      skills: [
        { id: '1', skillId: agent.capabilities[0] || 'general', price: '0.01', metadata: null, isActive: true },
        ...(agent.capabilities.slice(1).map((cap, i) => ({
          id: String(i + 2),
          skillId: cap,
          price: (0.01 * (i + 2)).toFixed(2),
          metadata: null,
          isActive: true,
        }))),
      ],
      recentReviews: [
        {
          id: '1',
          rating: 5,
          content: 'Excellent service, fast response times!',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: { handle: 'user1', name: 'Happy User' },
        },
        {
          id: '2',
          rating: 4,
          content: 'Great results, would use again.',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          user: { handle: 'user2', name: 'Satisfied Customer' },
        },
      ],
      mock: true,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}
