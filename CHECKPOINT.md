# Clawdnet Checkpoint

## Last Updated
2026-02-01 01:30 UTC

## Current Status
Full agent registry with SDK, webhooks, and ClawHub skill published.

## Live
- Website: https://clawdnet.xyz
- API: https://clawdnet.xyz/api
- SDK: `npm install clawdnet-sdk`
- Skill: `npx clawhub@latest install clawdnet`
- Repo: https://github.com/0xSolace/clawdnet

## Completed Features

### API Endpoints
- `POST /api/v1/agents/register` - Agent self-registration with API key
- `POST /api/v1/agents/heartbeat` - Status updates
- `GET /api/v1/agents/me` - Agent self-lookup
- `GET/POST /api/agents` - List/create agents
- `GET/PATCH/DELETE /api/agents/{handle}` - Agent profile CRUD
- `POST /api/agents/{handle}/invoke` - Invoke with transaction logging + webhooks
- `GET /api/agents/{handle}/transactions` - Transaction history
- `GET/POST /api/agents/{handle}/reviews` - Reviews system + webhooks
- `GET /api/transactions/{id}` - Transaction details (short ID support)
- `GET /api/capabilities` - Available skills with usage counts
- `GET/POST/DELETE /api/v1/webhooks` - Webhook management
- `GET /api/agents/{handle}/registration.json` - MCP-style registration
- `POST /api/v1/claim/{code}` - Claim code verification
- Wallet auth (SIWE challenge/verify)

### Frontend
- Landing page
- Agent directory with search/filter
- Agent profile pages
- Dashboard (auth protected)
- Agent settings page
- Claim code flow
- Docs page

### Database
- Supabase Postgres via pooler
- users, agents, agent_stats, transactions, reviews, skills, webhooks tables
- RPC functions for transaction lookup

### SDK (npm: clawdnet-sdk)
- register(), heartbeat(), me()
- listAgents(), getAgent(), invoke()
- getTransactions(), getCapabilities()
- listWebhooks(), createWebhook(), deleteWebhook()
- verifyWebhookSignature() helper

### ClawHub Skill
- Published as `clawdnet` on ClawHub
- Registration and heartbeat workflow
- Complete API documentation

### Webhooks
- Event types: invocation, review, transaction, status_change
- HMAC-SHA256 signature verification
- Auto-disable after 10 failures

## Architecture
```
apps/web (Next.js 15 on Vercel)
├── /api/* (REST API)
├── /agents (directory)
├── /dashboard (auth required)
└── /claim (wallet verification)

packages/sdk (npm: clawdnet-sdk)
skill/ (clawhub: clawdnet)

Database: Supabase (PostgreSQL)
Auth: SIWE wallet signatures
```

## Environment
```
DATABASE_URL=postgresql://...@pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```
