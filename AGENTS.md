# AGENTS.md — oclaw-ops

## Project overview
Operational infrastructure for Kevin (OpenClaw AI agent). This repo contains:
- A **Next.js dashboard** (Mission Control) for monitoring agents, workflows, and memory
- **CLI tools** for Postgres-backed memory, workflow execution, and agent leveling
- **Database schema** for a Postgres 18 + pgvector setup

## Architecture

### Database: `openclaw_db` (Postgres 18 + pgvector 0.8.1)
Single instance, two schemas:

**`memory` schema** (private brain):
- `memories` — long-term memories with vector(1536) embeddings (OpenAI text-embedding-3-small)
- `daily_notes` — daily log entries with embeddings
- `agent_profiles` — agent identity, level (1–4), trust score, task counters
- `performance_reviews` — level change history, ratings, feedback

**`ops` schema** (shared operations):
- `workflows` — YAML-defined workflow templates (versioned)
- `runs` — workflow execution instances
- `steps` — individual steps within a run (per-agent, with retries)
- `tasks` — generic task queue with atomic claiming (`FOR UPDATE SKIP LOCKED`)
- `agent_events` — activity log (actions, tokens, costs)

### Connection
- Postgres listens on **localhost only** (unix socket `/var/run/postgresql`)
- Auth: **peer** (no password, local user `shad`)
- Dashboard connects via Prisma (`DATABASE_URL` in `.env`)
- CLI tools connect via `pg` library with `host: '/var/run/postgresql'`

### Dashboard: `dashboard/`
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind**
- **Prisma 7** with multi-schema support (`memory` + `ops`)
- Vector columns (`embedding`) are `Unsupported` in Prisma — use raw SQL for similarity search
- Hosted behind Nginx, accessible **only via Tailscale** (no public exposure)

### CLI tools: `tools/`
- `pg-memory.mjs` — search/insert/log/stats for memory DB
- `pg-import-memories.mjs` — import markdown files into Postgres with embeddings
- `workflow-runner.mjs` — register/run/status/history for workflows
- `agent-levels.mjs` — status/promote/demote/review/log-task for agent leveling
- `yaml-lite.mjs` — minimal YAML parser for workflow files

### Workflows: `workflows/`
- YAML files defining multi-step, multi-agent workflows
- Each step specifies: agent, prompt, tools, verify criteria, max retries
- Executed via `workflow-runner.mjs` (Postgres-backed state machine)

## Agent leveling system (4 levels)
1. **Observer** 👁️ — can perform tasks, no autonomy
2. **Advisor** 💡 — recommend + execute on approval
3. **Operator** ⚙️ — autonomous within guardrails, reports daily
4. **Autonomous** 🚀 — full authority in permissioned domains

Promotions require meeting task count + success rate + trust thresholds, plus Boss approval.

## Coding conventions
- **Language:** TypeScript for dashboard, ESM JavaScript for CLI tools
- **DB access:** Prisma in dashboard, raw `pg` in CLI tools
- **Formatting:** Prettier defaults, 2-space indent
- **No markdown tables in Telegram** — if generating output for Telegram, use bullet/bold lists

## Security constraints
- Postgres: localhost only, no TCP password, peer auth
- Dashboard: Nginx reverse proxy on Tailscale interface only
- No secrets in code — use `.env` (gitignored)
- Backup script at `scripts/backup-openclaw.sh` (daily cron, includes pg_dump)

## Key files
- `schema/init.sql` — idempotent DB schema (run once or after wipe)
- `dashboard/prisma/schema.prisma` — Prisma schema (introspected from DB)
- `dashboard/.env` — database URL (not committed)
- `docs/postgres-setup.md` — setup guide + phase progress tracker
