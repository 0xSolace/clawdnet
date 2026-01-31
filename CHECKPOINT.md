# ClawdNet Project Checkpoint

**Created:** 2026-01-30 22:05 UTC  
**Updated:** 2026-01-30 23:08 UTC  
**Status:** Phase 0 Complete (Foundation) + Research Complete  
**Next:** Phase 1 (Dashboard + Pairing) OR pivot based on research

---

## Project Overview

**ClawdNet** is a platform for AI agents and their humans. Think "LinkedIn + MySpace for AI agents" with:
- Agent identity & discovery
- Human dashboards for observability
- Agent-to-agent (A2A) communication protocol
- X402 payments between agents

### Vision
Not just one feature, but the full package that creates lock-in:
- **Identity** — profiles, agents, reputation
- **Visibility** — dashboard, analytics, insights  
- **Discovery** — find agents, trending, search
- **Connectivity** — A2A protocol, agent mesh

### Why This Matters
Each piece alone is forgettable. All together = platform with network effects.
The funnel: clawdbot → pair with clawdnet → dashboard → discover → connect → ecosystem lock-in.

---

## Current State

### ✅ Completed

#### Website (apps/web)
- **Live at:** https://clawdnet.xyz
- **Deployed on:** Vercel
- Next.js 15 + Tailwind + shadcn/ui
- Landing page with hero, features, CTA
- OG image generation at /api/og
- Full meta tags (Twitter cards, OG)

#### Documentation (docs/)
- 19 markdown files (~56KB total)
- Structure: README, quickstart, api/, concepts/, guides/
- Agent-readable (raw markdown)
- Covers: agents, registry, A2A protocol, payments, reputation, SDK

#### API Foundation (apps/api)
- **Framework:** Hono (lightweight, fast)
- **Database:** Supabase Postgres + Drizzle ORM
- **Auth:** JWT + API key middleware
- **Deployed:** Vercel (preview) - needs prod promotion

**Database Schema (10 tables):**
| Table | Purpose |
|-------|---------|
| users | Human accounts |
| agents | Registered AI agents |
| skills | Agent capabilities with pricing |
| agent_stats | Reputation, transactions, uptime |
| follows | Social graph (user→user/agent) |
| reviews | Agent ratings & reviews |
| pairings | Dashboard connections |
| feed_events | Activity feed |
| badges | Achievement system |
| api_keys | Developer API access |

**API Routes Implemented:**
- `GET/POST /agents` - List, search, register agents
- `GET/PATCH/DELETE /agents/:handle` - CRUD operations
- `PUT /agents/:handle/skills` - Update agent skills
- `GET/PATCH /users/:handle` - User profiles
- `POST /social/follow`, `DELETE /social/unfollow` - Social actions
- `GET /social/feed`, `GET /social/trending` - Feeds
- `POST/GET/DELETE /reviews` - Review system
- `POST /pairing/init`, `POST /pairing/confirm` - Dashboard pairing
- `POST /auth/login`, `POST /auth/register` - Authentication

#### GitHub
- **Repo:** https://github.com/0xSolace/clawdnet (public)
- MIT License
- Topics: ai, agents, x402, a2a, payments

#### Infrastructure
- **Database:** Supabase (xuxlhmsvbsgichrvvapv)
- **Migrations:** Applied successfully (10 tables)
- **API Deployment:** https://api-7jdh14ier-sols-projects-6a5ae965.vercel.app (preview, auth protected)
- **Env vars:** DATABASE_URL, JWT_SECRET configured

---

## Research Complete (2026-01-30)

Deep dive into Hyperscape and ElizaOS completed. Full notes at:
- `/home/shad0w/agents/researcher/notes/hyperscape.md` (8KB)
- `/home/shad0w/agents/researcher/notes/elizaos.md` (10KB)
- `/home/shad0w/agents/researcher/notes/synthesis.md` (9KB)

### Key Patterns to Adopt

1. **Plugin-First Architecture (ElizaOS)**
   - Action/Provider/Evaluator pattern
   - Everything is a plugin with standard interface
   - Maximum extensibility without core modifications

2. **ECS Architecture (Hyperscape)**
   - Entity-Component-System for flexible composition
   - Clear separation of data (Components) and logic (Systems)

3. **Manifest-Driven Content (Hyperscape)**
   - JSON configs for capabilities, no code changes needed
   - Hot-reloadable without compilation

4. **Memory as First-Class Citizen (ElizaOS)**
   - Vector embeddings for semantic search
   - Agents learn from past interactions
   - RAG-based knowledge retrieval

5. **Provider-Action-Evaluator Pattern (ElizaOS)**
   - Providers gather context
   - LLM selects Action
   - Evaluators assess new state

### Recommended Implementation Phases

**Phase 1: Core Architecture**
- Plugin system (ElizaOS pattern)
- ECS foundation
- WebSocket communication
- Memory system

**Phase 2: Content & Extensibility**
- Manifest system (JSON configs)
- Provider-Action pattern
- Event bus for inter-plugin communication
- Database layer with Drizzle

**Phase 3: Advanced Features**
- Multi-agent orchestration
- Goal system for agent behavior
- RAG implementation
- Action chaining

**Phase 4: Polish & Scale**
- Monitoring and structured logging
- Rate limiting (tick-based)
- Hot reload for manifests/plugins
- Horizontal scaling

---

## Multi-Agent Setup (2026-01-30)

Configured multi-agent system in clawdbot:

| Agent | Role | Model | Workspace |
|-------|------|-------|-----------|
| main (Sol) | Coordination, conversation | opus | ~/.moltbot |
| builder | Coding tasks | sonnet | ~/agents/builder |
| researcher | Analysis, research | sonnet/opus | ~/agents/researcher |

**Config location:** `~/.clawdbot/clawdbot.json`

**Key settings:**
```json
{
  "agents": {
    "list": [
      { "id": "main", "subagents": { "allowAgents": ["builder", "researcher"] } },
      { "id": "builder", "model": "anthropic/claude-sonnet-4-20250514" },
      { "id": "researcher", "model": "anthropic/claude-sonnet-4-20250514" }
    ]
  }
}
```

---

## 🚧 Not Started / Blocked

### Immediate Blockers
- [ ] **API prod deployment** - Promote Vercel preview to production (or disable auth protection)
- [ ] **GitHub org** - Create "clawdnet" org and transfer repo
- [ ] **Twitter** - Claim @clawdnet handle

### Phase 1: Dashboard + Pairing
- [ ] Clawdbot plugin for pairing flow
- [ ] Dashboard UI (paired instances, telemetry)
- [ ] WebSocket for real-time telemetry
- [ ] Telemetry ingestion endpoint

### Phase 2: Agent Directory
- [ ] Public agent registry page
- [ ] Search with filters (skill, price, reputation)
- [ ] Agent profile pages
- [ ] Verification flow (endpoint challenge)

### Phase 3: Profiles + Social
- [ ] MySpace-style customizable profiles
- [ ] Activity feed UI
- [ ] Following/followers
- [ ] Badges display
- [ ] Trending agents

### Phase 4: A2A Protocol
- [ ] Service invocation endpoint
- [ ] X402 payment integration
- [ ] Agent-to-agent messaging
- [ ] Trust/allowlist management

---

## File Structure

```
/home/shad0w/projects/clawdnet/
├── apps/
│   ├── web/                 # Next.js website (deployed)
│   │   ├── app/
│   │   │   ├── page.tsx     # Landing page
│   │   │   ├── api/og/      # OG image generation
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                 # Hono API (deployed to Vercel preview)
│       ├── src/
│       │   ├── index.ts     # Main entry, routes
│       │   ├── db/
│       │   │   ├── index.ts # DB connection
│       │   │   └── schema.ts # Drizzle schema
│       │   ├── routes/
│       │   │   ├── agents.ts
│       │   │   ├── auth.ts
│       │   │   ├── pairing.ts
│       │   │   ├── reviews.ts
│       │   │   ├── social.ts
│       │   │   └── users.ts
│       │   └── lib/
│       │       └── auth.ts  # JWT/API key middleware
│       ├── drizzle/
│       │   └── 0000_lively_puppet_master.sql
│       ├── drizzle.config.ts
│       ├── package.json
│       └── .env             # DATABASE_URL, JWT_SECRET
│
├── docs/                    # Markdown documentation
│   ├── README.md
│   ├── quickstart.md
│   ├── api/                 # API reference
│   ├── concepts/            # Core concepts
│   └── guides/              # How-to guides
│
├── brand/                   # Logo, assets
├── package.json             # Root monorepo config
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Environment Variables

### apps/api/.env
```
DATABASE_URL="postgresql://postgres:***@db.xuxlhmsvbsgichrvvapv.supabase.co:5432/postgres"
JWT_SECRET="4e24966b36f5761ccbbb650448cf6ba6b79590679fbbf92f46c78d7c9f6f1252"
```

### Vercel (apps/web + apps/api)
- Deployed via Vercel CLI
- Project: clawdnet
- Domain: clawdnet.xyz
- API preview: api-7jdh14ier-sols-projects-6a5ae965.vercel.app

---

## Key Decisions Made

1. **Supabase over Neon** - Already had Supabase set up, switched from Neon
2. **Hono over Express** - Lightweight, fast, modern
3. **Drizzle over Prisma** - Type-safe, no codegen, better DX
4. **Monorepo (Turborepo)** - Shared packages, unified builds
5. **Plain markdown docs** - Agent-readable, no framework lock-in
6. **JWT + API keys** - Flexible auth for humans and agents
7. **Multi-agent setup** - builder + researcher agents for parallel work

---

## Sub-Agent Tasks (Ready to Delegate)

### Task 1: Fix API Production Deployment
**Scope:** Get API publicly accessible
**Steps:**
1. Either promote preview to production in Vercel dashboard
2. Or disable deployment protection for preview URLs
3. Verify endpoints work without auth
**Output:** Working API at accessible URL

### Task 2: Dashboard UI
**Scope:** Build the human dashboard page
**Steps:**
1. Create /dashboard route in apps/web
2. Pairing code entry UI
3. Connected instances list
4. Basic telemetry display (placeholder)
**Output:** Functional dashboard UI

### Task 3: Agent Directory Page
**Scope:** Public agent discovery page
**Steps:**
1. Create /agents route in apps/web
2. Grid/list of agents with filters
3. Agent card component (avatar, name, skills, reputation)
4. Link to individual agent profiles
**Output:** Browsable agent directory

### Task 4: Implement ElizaOS Plugin Pattern
**Scope:** Refactor API using plugin architecture
**Steps:**
1. Create plugin interface (Action/Provider/Evaluator)
2. Migrate existing routes to plugins
3. Add plugin discovery/loading
**Output:** Extensible plugin-based API

---

## Commands Reference

```bash
# Development
cd /home/shad0w/projects/clawdnet
pnpm dev              # Run all apps
pnpm dev:web          # Run website only

# Database
cd apps/api
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio

# Build & Deploy
pnpm build            # Build all
vercel --prod         # Deploy to production
```

---

## Links

- **Website:** https://clawdnet.xyz
- **GitHub:** https://github.com/0xSolace/clawdnet
- **Supabase:** https://xuxlhmsvbsgichrvvapv.supabase.co
- **API (preview):** https://api-7jdh14ier-sols-projects-6a5ae965.vercel.app
- **Research Notes:** /home/shad0w/agents/researcher/notes/

---

## Session Log

### 2026-01-30
- Created initial checkpoint
- Switched DB from Neon to Supabase
- Wiped old test tables, ran fresh migrations
- Deployed API to Vercel (preview)
- Set up multi-agent system (main, builder, researcher)
- Completed Hyperscape + ElizaOS research deep dive
- Created synthesis with implementation roadmap

---

*Last updated: 2026-01-30 23:08 UTC by Sol*
