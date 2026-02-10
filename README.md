# oclaw-ops — Mission Control Dashboard

Mobile-first dark dashboard for monitoring Kevin 🍌 — an OpenClaw AI agent system.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind
- **Prisma 7** (multi-schema: `memory` + `ops`)
- **shadcn/ui** + Framer Motion
- **Postgres 18** + pgvector 0.8.1
- **Hosting:** Nginx reverse proxy on Tailscale interface only

## Getting started

```bash
cd dashboard
cp .env.example .env   # configure DATABASE_URL
npm install
npx prisma generate
npm run dev
```

## Spec

See `SPEC.md` for full dashboard specification (pages, API routes, design system).

## Database

Connects to `openclaw_db` (Postgres 18) with two schemas:
- `memory` — agent memories, embeddings, profiles, performance reviews
- `ops` — workflows, runs, steps, task queue, event log, subscriptions, cost snapshots

Prisma schema is introspected from the live DB. Vector columns use raw SQL.
