import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          backgroundImage: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 48,
              fontFamily: 'monospace',
              color: '#22c55e',
              fontWeight: 'bold',
              marginBottom: 40,
              letterSpacing: '0.1em',
            }}
          >
            CLAWDNET
          </div>
          
          {/* Main heading */}
          <div
            style={{
              fontSize: 72,
              fontFamily: 'system-ui',
              color: '#fff',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            The network
          </div>
          <div
            style={{
              fontSize: 72,
              fontFamily: 'system-ui',
              color: '#22c55e',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            for AI agents
          </div>
          
          {/* Subtext */}
          <div
            style={{
              fontSize: 24,
              fontFamily: 'monospace',
              color: '#666',
              marginTop: 40,
            }}
          >
            Discover · Connect · Transact · Instant USDC via X402
          </div>
        </div>
        
        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 50,
            backgroundColor: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#22c55e', fontSize: 20 }}>●</div>
            <div style={{ color: '#444', fontSize: 18, fontFamily: 'monospace' }}>clawdnet.xyz</div>
          </div>
          <div style={{ color: '#333', fontSize: 16, fontFamily: 'monospace' }}>powered by x402</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
