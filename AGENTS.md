# AGENTS.md — Mission Control Dashboard

## Project overview
Mobile-first dark dashboard for monitoring Kevin (OpenClaw AI agent system). Shows KPIs, token/cost tracking, agent status, workflows, and server health.

## Stack
- **Next.js 16** (App Router) + TypeScript + Tailwind
- **Prisma 7** with multi-schema support (`memory` + `ops`)
- **shadcn/ui** for components + **Framer Motion** for animations
- **Recharts** for charts
- Hosted behind Nginx, accessible **only via Tailscale** (no auth needed)

## Database: `openclaw_db` (Postgres 18 + pgvector 0.8.1)

**`memory` schema** (private brain):
- `memories` — long-term memories with vector(1536) embeddings
- `daily_notes` — daily log entries with embeddings
- `agent_profiles` — agent identity, level (1–4), trust score, task counters
- `performance_reviews` — level change history, ratings, feedback

**`ops` schema** (shared operations):
- `workflows` — YAML-defined workflow templates (versioned)
- `runs` — workflow execution instances
- `steps` — individual steps within a run (per-agent, with retries)
- `tasks` — generic task queue with atomic claiming
- `agent_events` — activity log (actions, tokens, costs)
- `subscriptions` — monthly service costs (fixed)
- `cost_snapshots` — hourly cost aggregation
- `fx_rates` — daily USD→EUR exchange rates (ECB)

### Connection
- Postgres on localhost only (unix socket `/var/run/postgresql`, peer auth)
- Dashboard connects via Prisma (`DATABASE_URL` in `.env`)
- Vector columns are `Unsupported` in Prisma — use raw SQL for similarity search

## Coding conventions
- TypeScript, Prettier defaults, 2-space indent
- App Router (no pages/ dir)
- Server Components by default, `"use client"` only when needed
- API routes in `src/app/api/`
- Prisma client in `src/lib/db.ts`
- WCAG 2.1 AA accessibility (contrast, focus, aria, keyboard nav)
- No markdown tables in output destined for Telegram

## Design system
- Dark mode default (slate/zinc), light mode toggle
- Accent: amber/yellow (🍌 minion vibes)
- Status colors: green (success), red (error), amber (warning), blue (running), gray (idle)
- Mobile-first, responsive at 768px
- Animations under 300ms, respect `prefers-reduced-motion`

## Key files
- `dashboard/prisma/schema.prisma` — Prisma schema (introspected from DB)
- `dashboard/.env` — database URL (not committed)
- `dashboard/.env.example` — template
- `SPEC.md` — full dashboard specification
- `docs/README.md` — feature documentation
- `docs/API.md` — API reference

## Implementation Status

### ✅ Completed Features

**Core Pages**:
- Overview (/) — KPI cards, agent strip, activity feed
- Agents (/agents, /agents/[id]) — List, detail with promote/demote/review
- Workflows (/workflows) — List with run trigger modal
- Runs (/runs, /runs/[id]) — History with filters, detail with retry
- Memory (/memory) — Search, browse (memories/notes), stats tab
- Events (/events) — Feed with filters (agent, type, date)
- System (/system) — CPU, RAM, disk, DB, OpenClaw status

**Phase 7 Intelligence**:
- Priorities (/priorities) — Priority stack with severity
- Knowledge (/knowledge) — Entity list with types/aliases
- Mistakes (/mistakes) — Mistake log with resolution tracking
- Reactions (/reactions) — Trigger-responder reaction matrix
- Costs (/costs) — Subscription tracking + cost snapshots
- Compounds (/compounds) — Periodic memory summaries

**Design & UX**:
- Theme: Dark/light toggle (dark default)
- Mobile: Bottom nav with top 5 + hamburger
- Accessibility: WCAG 2.1 AA compliant (contrast, focus, aria, keyboard)
- Motion: Framer Motion utilities with prefers-reduced-motion support
- Components: 19 shadcn/ui components + custom dashboard components

**APIs**: All 30+ endpoints implemented
- Agents: list, detail, review, promote, demote
- Workflows: list, trigger run
- Runs: list with filters, detail
- Memory: search, stats
- Events: list with filters
- System: health metrics
- Priorities, Mistakes, Reactions, Knowledge, Costs, Compounds: full CRUD

### 📝 Known Limitations
- Memory search: Text-based only (no vector embeddings in UI)
- Workflow cancel: Backend stub (needs engine integration)
- CSV export: Not implemented (events page)
- File Drop: Not implemented (future enhancement)
- Knowledge graph: List view only (no graph visualization)

### 🏗️ Architecture Notes
- Next.js 16 App Router with React Server Components
- Prisma 7 with multi-schema (memory + ops)
- NextAuth 5 for authentication (session-based)
- All API params must be awaited (Next.js 16 requirement)
- Framer Motion for animations (respects reduced motion)
- Tailwind 4 + shadcn/ui for styling

### 🚀 Build Status
✅ Production build passes (verified Feb 2026)
- TypeScript: No errors
- Build: Successful (31 routes)
- All dynamic routes properly configured
