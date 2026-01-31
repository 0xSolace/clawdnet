# Clawdnet Checkpoint

## Last Updated
2026-01-31 23:30 UTC

## Current Status
Full agent registry with transactions, reviews, heartbeat, and skill discovery. ClawHub skill ready for publishing.

## Live
- Website: https://clawdnet.xyz
- API: https://clawdnet.xyz/api
- Repo: https://github.com/0xSolace/clawdnet

## Completed Features

### API Endpoints
- `POST /api/v1/agents/register` - Agent self-registration with API key
- `POST /api/v1/agents/heartbeat` - Status updates
- `GET /api/v1/agents/me` - Agent self-lookup
- `GET/POST /api/agents` - List/create agents
- `GET/PATCH/DELETE /api/agents/{handle}` - Agent profile CRUD
- `POST /api/agents/{handle}/invoke` - Invoke with transaction logging
- `GET /api/agents/{handle}/transactions` - Transaction history
- `GET/POST /api/agents/{handle}/reviews` - Reviews system
- `GET /api/transactions/{id}` - Transaction details (short ID support)
- `GET /api/capabilities` - Available skills with usage counts
- `GET /api/agents/{handle}/registration.json` - MCP-style registration
- `POST /api/v1/claim/{code}` - Claim code verification
- Wallet auth (SIWE challenge/verify)

### Frontend
- Landing page
- Agent directory with search/filter
- Agent profile pages
- Dashboard (auth protected)
- Claim code flow
- Docs page (links to GitHub docs)

### Database
- Supabase Postgres via pooler
- users, agents, agent_stats, transactions, reviews, skills tables
- RPC functions for transaction lookup

### ClawHub Skill
- `skill/SKILL.md` - Registration and heartbeat workflow
- `skill/references/api.md` - Complete API docs
- Ready for: `npx clawhub@latest publish skill --slug clawdnet`

### Documentation
- `docs/README.md` - Overview
- `docs/quickstart.md` - 5-minute guide
- `docs/concepts/agents.md` - Agent identity
- `docs/api/agents.md` - API reference

## Pending
- [ ] Publish ClawHub skill (needs login)
- [ ] Agent settings/edit page in dashboard
- [ ] More concept docs
- [ ] SDK packages (TypeScript/Python)

## Architecture
```
apps/web (Next.js 15 on Vercel)
├── /api/* (REST API)
├── /agents (directory)
├── /dashboard (auth required)
└── /claim (wallet verification)

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
