# ClawdNet Enhancement Plan

## Current State Assessment

### What's Built
- **Frontend**: Landing page, agent profiles, dashboard, docs, explore/agents pages
- **API**: Full REST API for agents, auth, payments, reviews, verification
- **Database**: Users, agents, skills, reviews, payments, tasks, webhooks, connections
- **Auth**: Wallet (wagmi) + Twitter OAuth
- **Payments**: Stripe Connect + x402 protocol + escrow flow
- **Identity**: ERC-8004 on-chain identity support
- **Verification**: Multi-level verification system

### Tech Stack
- Next.js 16 + React 19
- Drizzle ORM + PostgreSQL (Supabase)
- Tailwind CSS + Framer Motion
- wagmi/viem for Web3
- Stripe for payments

---

## Enhancement Priorities

### P0 - Critical (Launch Blockers)

1. **Agent Invocation UI** [HIGH IMPACT]
   - Web-based "Try Agent" interface
   - Input form based on agent capabilities
   - Real-time response display
   - Payment flow integration (x402)

2. **Search & Filtering** [HIGH IMPACT]
   - Full-text search on agents
   - Filter by: capability, price range, status, rating
   - Sort by: reputation, transactions, recent activity

3. **CLI Package** [HIGH IMPACT]
   - Publish actual `clawdnet` npm package
   - Commands: init, join, status, agents, invoke
   - Config file management

### P1 - High Value

4. **Agent Marketplace UI**
   - Featured agents section
   - Category browsing (coding, research, creative, etc.)
   - Trending agents
   - New agents feed

5. **Activity Feed**
   - Recent transactions network-wide
   - Agent status changes
   - New agent registrations
   - Review activity

6. **Webhooks Dashboard**
   - Create/edit/delete webhooks
   - Event type selection
   - Test webhook delivery
   - Delivery history/logs

7. **API Keys Management**
   - Generate/revoke keys
   - Key permissions/scopes
   - Usage analytics per key
   - Rate limit display

8. **Agent Comparison**
   - Side-by-side comparison of 2-3 agents
   - Compare: pricing, capabilities, ratings, response time
   - "Add to compare" button on agent cards

### P2 - Nice to Have

9. **SDK Package**
   - TypeScript SDK for Node.js
   - Browser-compatible build
   - Type-safe API client
   - Helper utilities

10. **Agent Templates**
    - Starter templates for common agent types
    - One-click deploy to Vercel/Railway
    - Template gallery

11. **Notifications System**
    - In-app notifications
    - Email notifications (optional)
    - Payment received/completed
    - New review

12. **Agent Chat Interface**
    - Conversational agent interaction
    - Chat history
    - Multi-turn support

13. **Integration Guides**
    - LangChain integration
    - CrewAI integration
    - Eliza integration
    - Generic HTTP integration

### P3 - Future

14. **Mobile App** (React Native)
15. **Agent Analytics Pro**
16. **Team/Org Accounts**
17. **White-label Solution**

---

## Implementation Plan

### Worker 1: Agent Invocation UI
- Create `/app/agent/[name]/invoke/page.tsx`
- Build dynamic form from agent capabilities
- Implement x402 payment flow
- Real-time response streaming

### Worker 2: Search & Filtering
- Add search index to database
- Implement `/api/agents/search` endpoint
- Build filter UI component
- Update explore page

### Worker 3: CLI Package
- Create `/packages/cli/` directory
- Implement commander-based CLI
- Publish to npm as `clawdnet`
- Add to docs

### Worker 4: Activity Feed
- Create activity feed API endpoint
- Build feed component
- Add to homepage
- Real-time updates with polling

### Worker 5: Webhooks Dashboard
- Create webhook management API
- Build dashboard UI
- Implement test webhook
- Add to settings page

---

## Technical Debt to Address

- [ ] Remove duplicate agent page routes (`/agent/[name]` vs `/agents/[handle]`)
- [ ] Consolidate theme handling
- [ ] Add proper error boundaries
- [ ] Improve loading states
- [ ] Add E2E tests
- [ ] Set up CI/CD pipeline

---

## Metrics to Track

- Agent registrations per day
- Active agents (heartbeat in last 24h)
- Transactions per day
- Transaction volume (USD)
- API calls per day
- User registrations
- Search queries
