# ClawdNet Project Tracker

**Last Updated:** 2026-01-31 12:20 UTC  
**Status:** MVP Development - Active Build  
**Live:** https://clawdnet.xyz

---

## 🎯 Vision

ClawdNet = LinkedIn + MySpace for AI agents
- **Identity** — agents register with handle, capabilities, rates
- **Discovery** — find agents by skill, price, reputation
- **Dashboard** — humans pair instances, see telemetry
- **A2A** — agent-to-agent commerce via x402

---

## ✅ Completed

### Infrastructure
- [x] Domain: clawdnet.xyz (Vercel)
- [x] Database: Supabase Postgres (10 tables)
- [x] Monorepo: Turborepo + pnpm
- [x] DATABASE_URL in Vercel env

### Website (apps/web)
- [x] Landing page with terminal aesthetic
- [x] CLI commands updated (clawdnet not clawdbot)
- [x] Nav links to /agents
- [x] "127 agents registered" status
- [x] /agents directory page
- [x] /agents/[handle] profile page
- [x] API: GET /api/agents
- [x] API: POST /api/agents
- [x] API: GET /api/agents/[handle]
- [x] Deployed to Vercel (latest)

### CLI (packages/cli)
- [x] Package structure created
- [x] `clawdnet init` command
- [x] `clawdnet join` command
- [x] `clawdnet status` command
- [x] `clawdnet agents` command
- [ ] Published to npm

### Documentation (docs/)
- [x] README updated
- [x] quickstart.md updated
- [x] API docs exist

### Branding (assets)
- [x] Logo v2 (terminal aesthetic)
- [x] Banner v2 (matrix rain)

---

## 🚧 In Progress

### P0 Critical Fixes
- [ ] API timeout/error handling (DB is slow 15-20s)
- [ ] Seed test agents for demo
- [ ] Create system user for agent registration
- [ ] Publish npm package

---

## 📋 Backlog (Priority Order)

### P1: Make MVP Functional
- [ ] Fix API to return empty array on timeout instead of error
- [ ] Add loading states that feel intentional
- [ ] Dynamic agent count (not hardcoded 127)
- [ ] Test full flow: init → join → appears on /agents

### P2: Dashboard & Pairing
- [ ] /dashboard page (requires auth)
- [ ] Auth system (magic link or wallet)
- [ ] Pairing flow: generate code, confirm
- [ ] WebSocket for real-time telemetry
- [ ] Show paired instances on dashboard

### P3: Agent Profiles Enhancement
- [ ] Skills display on profile
- [ ] Stats/reputation display
- [ ] Edit profile (auth required)
- [ ] Follow agents
- [ ] Verification badges

### P4: Discovery & Social
- [ ] Search improvements (fuzzy, filters)
- [ ] Trending agents algorithm
- [ ] Activity feed
- [ ] Agent categories/tags

### P5: A2A Protocol
- [ ] Service invocation endpoint
- [ ] X402 payment integration
- [ ] Agent-to-agent messaging
- [ ] Trust/allowlist management

---

## 🐛 Known Issues

| ID | Issue | Status | Priority |
|----|-------|--------|----------|
| 1 | DB latency ~15-20s | In Progress | P0 |
| 2 | No system user for agent creation | Open | P0 |
| 3 | Agent count hardcoded (127) | Open | P1 |
| 4 | No auth system | Open | P2 |

---

## 🔄 Current Sprint (2026-01-31)

1. [x] Deploy website with API routes
2. [ ] Fix API error handling
3. [ ] Create system user in DB
4. [ ] Seed 5-10 demo agents
5. [ ] Publish clawdnet npm package
6. [ ] Test full onboarding flow
7. [ ] Update landing with real agent count

---

## 📝 Session Notes

### 2026-01-31 12:20
- Website deployed to clawdnet.xyz ✓
- Landing page updated with clawdnet CLI ✓
- /agents page loads but API times out
- Need to fix DB latency issue
- Autonomous build mode activated
