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
