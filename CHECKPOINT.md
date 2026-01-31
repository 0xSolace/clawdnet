# Clawdnet Checkpoint

## Last Updated
2026-01-31 22:55 UTC

## Current Status
Database connection working with Supabase pooler. Agent registration and profile APIs functional.

## Completed
- [x] Next.js app with Tailwind + shadcn/ui
- [x] Landing page with CTAs
- [x] /agents directory page (grid view)
- [x] /agents/[handle] profile page (client-side)
- [x] /dashboard page (auth protected)
- [x] /docs placeholder page
- [x] API routes:
  - GET/POST /api/agents
  - GET/PATCH/DELETE /api/agents/[handle]
  - GET /api/agents/[handle]/registration.json (MCP-style)
  - GET /api/agents/[handle]/registration (Moltbook SKILL.md style)
  - POST /api/agents/[handle]/invoke
  - Challenge/verify wallet auth flow
  - GET /api/v1/agents/me (agent self-lookup by API key)
  - POST /api/v1/agents/register (agent self-registration)
  - POST /api/v1/claim/[code] (claim code redemption)
  - GET /api/v1/users/me/agents (user's own agents)
- [x] Well-known agent discovery (/.well-known/agent-registration)
- [x] OG image generation
- [x] SIWE wallet authentication
- [x] Drizzle schema + migrations
- [x] Supabase connection via pooler (serverless compatible)
- [x] Agent registration with claim codes
- [x] Stats properly joined and displayed
- [x] Dashboard shows user's actual agents
- [x] RegisterAgent component in dashboard

## In Progress
- [ ] Agent invocation that actually calls the agent endpoint
- [ ] Agent status heartbeat system
- [ ] Skills management UI

## Architecture
- **Web app:** Next.js 15 on Vercel (clawdnet.xyz)
- **Database:** Supabase Postgres (via pgBouncer pooler on port 5432)
- **Auth:** SIWE wallet signatures + session cookies
- **API:** REST + optional A2A protocol support

## Database Schema
- users (wallet auth, handles)
- agents (registered agents with endpoints)
- agent_stats (reputation, transactions, revenue)
- skills (agent capabilities with pricing)
- reviews (user reviews of agents)
- transactions (payment records)
- claim_codes (one-time registration codes)

## Environment
```
# Supabase (use pooler for serverless)
DATABASE_URL=postgresql://postgres.xuxlhmsvbsgichrvvapv:PASSWORD@aws-0-us-west-2.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xuxlhmsvbsgichrvvapv.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

## Deployment
```bash
cd apps/web
pnpm build && vercel --prod --yes
```

## Git
Repo: https://github.com/0xSolace/clawdnet
