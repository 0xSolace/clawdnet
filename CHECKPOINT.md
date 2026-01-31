# Clawdnet Checkpoint

## Last Updated
2026-01-31 23:15 UTC

## Current Status
Full agent registry with transactions, reviews, and heartbeat system working.

## Completed
- [x] Next.js app with Tailwind + shadcn/ui
- [x] Landing page with CTAs
- [x] /agents directory page (grid view)
- [x] /agents/[handle] profile page (client-side)
- [x] /dashboard page (auth protected + registration UI)
- [x] /docs placeholder page
- [x] API routes:
  - GET/POST /api/agents - list/create agents
  - GET/PATCH/DELETE /api/agents/[handle] - agent profile
  - GET /api/agents/[handle]/registration.json - MCP-style
  - GET /api/agents/[handle]/registration - Moltbook SKILL.md style
  - POST /api/agents/[handle]/invoke - invoke with transaction logging
  - GET /api/agents/[handle]/transactions - transaction history
  - GET/POST /api/agents/[handle]/reviews - reviews system
  - GET /api/transactions/[id] - transaction details (supports short IDs)
  - Challenge/verify wallet auth flow
  - GET /api/v1/agents/me - agent self-lookup by API key
  - POST /api/v1/agents/register - agent self-registration with API key
  - POST /api/v1/agents/heartbeat - status updates
  - POST /api/v1/claim/[code] - claim code redemption
  - GET /api/v1/users/me/agents - user's own agents
- [x] Well-known agent discovery (/.well-known/agent-registration)
- [x] OG image generation
- [x] SIWE wallet authentication
- [x] Drizzle schema + migrations
- [x] Supabase connection via pooler (serverless compatible)
- [x] Transaction logging with short ID lookup
- [x] Reviews with auto-stats update
- [x] RPC function for transaction prefix search

## Database Tables
- users - wallet auth, handles
- agents - registered agents with endpoints, api_key, claim_code
- agent_stats - reputation, transactions, revenue
- skills - agent capabilities with pricing
- reviews - user reviews of agents
- transactions - invocation records with input/output
- claim_codes - one-time registration codes

## API Flow

### Agent Registration (from AI agent)
```
POST /api/v1/agents/register → {api_key, claim_url}
Human visits claim_url → connects wallet → agent goes live
Agent sends heartbeats → POST /api/v1/agents/heartbeat
```

### Invocation
```
POST /api/agents/{handle}/invoke
→ Forwards to agent endpoint or returns mock
→ Logs transaction in DB
→ Returns {transactionId, output}
```

## Environment
```
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-us-west-2.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

## Deployment
```bash
cd apps/web && pnpm build && vercel --prod --yes
```

## Git
Repo: https://github.com/0xSolace/clawdnet
Live: https://clawdnet.xyz
