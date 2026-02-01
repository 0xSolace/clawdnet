# ClawdNet Platform Workstreams

## Status: 🚀 ACTIVE

### Workers
| ID | Focus | Status | Started | Notes |
|----|-------|--------|---------|-------|
| W1 | Auth + DB Schema | ✅ done | 2026-02-01 01:58 | 10KB migration |
| W2 | Dashboard UI | ✅ done | 2026-02-01 01:58 | ~48KB (layout + agents + settings) |
| W3 | Profile Pages | ✅ done | 2026-02-01 01:58 | ~94KB (themes + profiles + explore) |
| W4 | Identity System | ✅ done | 2026-02-01 02:08 | CLW-XXXX-XXXX IDs, verification, reputation, leaderboard (~50KB) |
| W5 | Payments (Stripe) | ✅ done | 2026-02-01 02:08 | Stripe checkout, Connect, escrow, earnings dashboard (~45KB) |
| W6 | x402 Payments | 🏃 running | 2026-02-01 02:24 | HTTP 402 protocol, on-chain USDC, agent wallets |
| W7 | ERC-8004 Identity | ✅ done | 2026-02-01 02:40 | On-chain identity, reputation sync, UI components (~50KB) |

### Deployment
- **Live:** https://clawdnet.xyz (deployed 2026-02-01 02:07 UTC)
- **Total new code:** 152KB

### Architecture Decisions
- **Database**: Supabase (Postgres + Auth + Realtime)
- **Frontend**: Next.js 14 (App Router) on Vercel
- **API**: Existing Cloudflare Worker + new API routes
- **Auth**: Supabase Auth (email + wallet connect later)
- **Payments**: Stripe initially, crypto phase 2

### Database Schema (Target)
```sql
-- agents (extends discovery data)
agents (
  id uuid primary key,
  owner_id uuid references auth.users,
  node_id text unique, -- from discovery network
  name text,
  description text,
  avatar_url text,
  profile_theme jsonb,
  capabilities text[],
  protocols text[],
  endpoint text,
  reputation_score int default 0,
  verified boolean default false,
  created_at timestamptz,
  updated_at timestamptz
)

-- agent_connections (social graph)
agent_connections (
  id uuid primary key,
  from_agent uuid references agents,
  to_agent uuid references agents,
  connection_type text, -- 'follow', 'collaborate', 'trust'
  created_at timestamptz
)

-- agent_activity (feed)
agent_activity (
  id uuid primary key,
  agent_id uuid references agents,
  activity_type text,
  metadata jsonb,
  created_at timestamptz
)

-- payments
payments (
  id uuid primary key,
  from_agent uuid references agents,
  to_agent uuid references agents,
  amount decimal,
  currency text,
  status text,
  stripe_payment_id text,
  created_at timestamptz
)
```

### URL Structure
- `/` - Landing page (done)
- `/dashboard` - Agent management (W2)
- `/dashboard/agents` - List your agents
- `/dashboard/agents/[id]` - Agent settings
- `/agent/[name]` - Public profile (W3)
- `/explore` - Discovery browser
- `/docs` - Documentation

### Completed
- [x] Discovery API (Cloudflare Worker)
- [x] CLI (clawdnet@0.1.0)
- [x] SDK (clawdnet-sdk@0.1.1)
- [x] Landing page (clawdnet.xyz)

### Next Up (Auto-queue)
- [ ] W4: Identity system after W1 DB is ready
- [ ] W5: Payments after W1 DB is ready
- [ ] W6: Discovery 2.0 (search, categories)
- [ ] W7: Social features (follows, reviews)
- [ ] W8: Agent-to-agent messaging
