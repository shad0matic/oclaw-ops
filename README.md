# oclaw-ops

Operational infrastructure for Kevin 🍌 — an OpenClaw-based AI agent system.

## What's in here

- **dashboard/** — Next.js + Prisma + Tailwind Mission Control UI (Phase 6)
- **schema/** — Postgres schema (init.sql, idempotent)
- **tools/** — Node.js CLI tools for memory, workflows, and agent leveling
- **workflows/** — YAML workflow definitions
- **scripts/** — Backup and maintenance scripts
- **docs/** — Setup guides and operational docs

## Stack

- **Runtime:** Node.js 24 + OpenClaw
- **Database:** Postgres 18 + pgvector 0.8.1
- **Dashboard:** Next.js (App Router) + Prisma + Tailwind
- **Hosting:** Self-hosted VPS, dashboard accessible via Tailscale only
- **Security:** Postgres localhost-only, Nginx reverse proxy on Tailscale interface

## Database

Single Postgres instance, two schemas:
- `memory` — agent memories, embeddings, profiles, performance reviews
- `ops` — workflows, runs, steps, task queue, event log

```bash
# Init DB (requires superuser for pgvector extension)
sudo -u postgres psql -d openclaw_db -c "CREATE EXTENSION vector;"
psql -d openclaw_db -f schema/init.sql
```

## Tools

```bash
# Memory search (hybrid vector + keyword)
node tools/pg-memory.mjs search "query"

# Import markdown memories into Postgres
node tools/pg-import-memories.mjs

# Workflow management
node tools/workflow-runner.mjs list
node tools/workflow-runner.mjs run research-summarize --task "topic"

# Agent leveling
node tools/agent-levels.mjs status
```

## Dashboard

```bash
cd dashboard
cp .env.example .env   # configure DATABASE_URL
npm install
npx prisma generate
npm run dev
```

## Backup

Daily at 03h00 UTC via system cron. Includes Postgres dump + OpenClaw workspace.

```bash
# Manual backup
./scripts/backup-openclaw.sh
```

## Roadmap

See `docs/postgres-setup.md` for phase progress.
