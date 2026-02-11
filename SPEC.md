# SPEC.md — Mission Control Dashboard

## Vision
Mobile-first dark dashboard to monitor Kevin (OpenClaw agent system). Accessible via Tailscale only. Clear KPIs, drill-down on click, no fluff.

---

## Tech stack
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind + shadcn/ui (dark mode default, light mode support)
- **Data:** Prisma 7 (multi-schema) + raw SQL for vector queries
- **Charts:** Recharts (lightweight, shadcn-compatible)
- **Animations:** Framer Motion (page transitions, card reveals, progress bars)
- **Accessibility:** WCAG 2.1 AA compliance (contrast, focus, aria labels, keyboard nav)
- **Hosting:** Nginx reverse proxy on Tailscale interface, Next.js on localhost:3000

---

## Pages

### `/` — Overview (Home)
The command center. Everything at a glance, drill down for details.

**KPI cards (top row):**
- 🍌 Kevin status (uptime, current session, last activity)
- 💰 Token usage today / this week / this month (cost in €)
- 🖥️ Server load (CPU %, RAM %, disk %)
- 🏃 Active runs (running workflows count)
- 📊 Tasks completed today

**Agent strip (horizontal scroll on mobile):**
- One card per agent: avatar/emoji, name, level badge, current status (idle/running/error)
- Tap → `/agents/[id]`

**Recent activity feed (bottom):**
- Last 20 events across all agents
- Filterable pills: all / memory / workflow / level / error
- Each event: timestamp, agent emoji, event type, short detail
- Tap → relevant detail page

**Auto-refresh:** Poll every 30s (SSE later if needed)

---

### `/agents` — Agent roster
List view of all agents with key metrics.

**Per agent row/card:**
- Emoji + name
- Level badge (L1 👁️ / L2 💡 / L3 ⚙️ / L4 🚀) with color
- Trust score (progress bar)
- Tasks: success / total (percentage)
- Status: idle / running / error
- Last active timestamp
- Tap → `/agents/[id]`

**Summary bar:** Total agents, average trust, total tasks

---

### `/agents/[id]` — Agent detail
Deep dive on one agent.

**Header:** Name, emoji, level badge, trust score, member since

**Tabs:**
- **Overview** — KPIs: total tasks, success rate, tokens used, cost, avg response time
- **Activity** — Event feed filtered to this agent (paginated)
- **Reviews** — Performance review history (rating, summary, level changes)
- **Config** — Model, workspace path, tools available (read-only)

**Actions:**
- Promote / Demote buttons (sends request, Boss confirms via Telegram)
- Add review form (rating 1-5, summary, feedback)

---

### `/workflows` — Workflow library
List of registered workflows.

**Per workflow card:**
- Name, description, version, enabled/disabled toggle
- Total runs, success rate, avg duration
- Last run status + timestamp
- "Run" button → trigger modal (enter task description, optional context JSON)
- Tap → run history for this workflow

---

### `/runs` — Run history
All workflow runs, most recent first.

**Per run row:**
- Workflow name, task (truncated), status badge (running/done/failed/cancelled)
- Step progress: `3/5 steps done` with mini progress bar
- Duration, triggered by, timestamps
- Tap → `/runs/[id]`

**Filters:** Status, workflow, agent, date range

---

### `/runs/[id]` — Run detail
Step-by-step execution view.

**Header:** Workflow name, task, overall status, duration

**Step timeline (vertical, mobile-friendly):**
- Each step: name, agent badge, status icon, duration
- Expand on tap: input prompt, output, error (if failed), retry count
- Animated progress for running steps

**Actions:** Cancel run, retry failed step

---

### `/memory` — Memory browser
Search and browse agent memories.

**Search bar (top):** Semantic search input
- Results show: content preview, source file, tags, importance, similarity score
- Tap → full content in modal/drawer

**Browse tabs:**
- **Memories** — paginated list, sortable by date/importance
- **Daily notes** — calendar view or date list
- **Stats** — total memories, total daily notes, DB size, embedding cost

---

### `/events` — Event feed
Full event log across all agents.

**Columns/fields:** Timestamp, agent, event type, detail (truncated), tokens, cost

**Filters:** Agent, event type, date range

**Export:** CSV download (future)

---

### `/system` — Server status
VPS health at a glance.

**Metrics:**
- CPU usage (current + 24h sparkline)
- RAM usage (current + 24h sparkline)
- Disk usage (bar)
- Postgres: DB size, connection count, oldest running query
- OpenClaw: version, uptime, gateway status
- Next backup: countdown timer

---

## API routes (`/api/`)

### Data endpoints (Prisma)
- `GET /api/agents` — list agents with stats
- `GET /api/agents/[id]` — agent detail + recent events
- `POST /api/agents/[id]/review` — submit review
- `POST /api/agents/[id]/promote` — level up (with reason)
- `POST /api/agents/[id]/demote` — level down (with reason)
- `GET /api/workflows` — list workflows
- `POST /api/workflows/[id]/run` — trigger run
- `GET /api/runs` — list runs (with filters)
- `GET /api/runs/[id]` — run detail + steps
- `GET /api/events` — event feed (paginated, filterable)

### Special endpoints (raw SQL)
- `POST /api/memory/search` — vector similarity search (body: `{ query, limit }`)
- `GET /api/memory/stats` — DB stats
- `GET /api/system/health` — CPU, RAM, disk, PG stats, OpenClaw status

---

## Design system

### Theme
- **Dark mode default** (slate/zinc palette), light mode toggle
- Accent color: amber/yellow (🍌 minion vibes)
- Status colors: green (success), red (error), amber (warning), blue (running), gray (idle)

### Typography
- Font: Inter (shadcn default) or system font stack
- Sizes: mobile-optimized, minimum 16px body text (WCAG)

### Layout
- Mobile: single column, bottom nav
- Desktop: sidebar nav + main content area
- Responsive breakpoint: 768px

### Animations (Framer Motion)
- Page transitions: subtle slide + fade
- Card reveals: stagger on load
- Progress bars: animated fill
- Status changes: pulse on update
- Keep animations under 300ms, respect `prefers-reduced-motion`

### Accessibility (WCAG 2.1 AA)
- Minimum contrast ratio 4.5:1 (text), 3:1 (large text/UI)
- All interactive elements keyboard-accessible
- Focus rings visible on tab navigation
- Aria labels on icons, badges, charts
- Screen reader text for status indicators
- No information conveyed by color alone (always text/icon too)

---

## Data refresh strategy
- **V1:** Client-side polling every 30s on active pages
- **V2 (later):** SSE or WebSocket for real-time event feed
- Stale data indicator: "Updated 30s ago" in footer

---

## Priority order (build sequence)
1. Layout shell (sidebar/bottom nav, dark theme, shadcn setup)
2. `/` Overview with KPI cards + agent strip
3. `/agents` list + `/agents/[id]` detail
4. `/system` server health
5. `/events` feed
6. `/runs` + `/runs/[id]`
7. `/workflows`
8. `/memory` browser

---

---

## File Drop (static share site)

Private static file server on a subdomain (e.g. `drop.yourdomain.com`) for sharing files from Kevin → Boss on mobile.

**Behavior:**
- Default response: **403 Forbidden** (no directory listing, no index)
- Files only accessible via **exact URL** with random hash path (e.g. `drop.glubi.com/a3f8c1e9/report.html`)
- Files auto-expire after configurable TTL (default 7 days, cron cleanup)
- Nginx serves static files, no app server needed

**How it works:**
1. Kevin writes file to `/var/www/drop/<random-hash>/filename.ext`
2. Kevin sends Boss the direct link via Telegram
3. Anyone without the exact path gets 403
4. Daily cron deletes files older than TTL

**Nginx config:**
```nginx
server {
    listen 443 ssl;
    server_name drop.glubi.com;
    root /var/www/drop;
    autoindex off;
    default_type application/octet-stream;
    location = / { return 403; }
    location / { try_files $uri =403; }
}
```

**CLI tool:** `tools/file-drop.mjs`
- `drop <filepath> [--ttl 7d]` → copies file, returns URL
- `list` → show active drops
- `clean` → remove expired files

**Priority:** After Phase 6 (quick win, ~1h setup)

---

---

## Phase 7 — Cross-Agent Intelligence Pages

### `/priorities` — Shared Priority Stack
What matters right now across all agents.

**Priority list (sorted by priority × signal count):**
- Entity name, type badge (topic/person/project/keyword/url)
- Priority level (P1-P10, color-coded: P7+ = red, P4-6 = amber, P1-3 = gray)
- Signal count badge (🔗 ×3 = seen by 3 agents)
- Reported by (agent emoji), confirmed by (agent emoji list)
- Context text (truncated, expand on tap)
- Last seen timestamp
- Resolved toggle (strikes through, moves to bottom)

**Filters:** Active only / all, entity type, min priority

**Actions:**
- "Add Signal" button → modal: entity, type, priority, context
- Resolve / Unresolve toggle
- Tap → detail drawer with cross-signal history

**API:**
- `GET /api/priorities` — list priorities (query: `active`, `type`, `min_priority`)
- `POST /api/priorities` — create/bump signal (body: `{ entity, entity_type, priority, context, agent }`)
- `PATCH /api/priorities/[id]` — resolve/unresolve
- `GET /api/priorities/[id]/signals` — cross-signal history for a priority

---

### `/knowledge` — Knowledge Graph
Visual entity browser — people, companies, projects and how they connect.

**Graph view (desktop):**
- Force-directed graph (use `react-force-graph-2d` or `d3-force`)
- Nodes: colored by entity type, sized by relation count
- Edges: labeled with relation type, thickness = strength
- Click node → detail panel (sidebar)
- Zoom/pan, drag nodes

**List view (mobile default):**
- Grouped by entity type (accordion)
- Per entity: name, type badge, alias list, property pills
- Relation count badge
- Tap → detail drawer: all relations, properties, first seen by

**Search bar:** Filter entities by name/alias (instant)

**Actions:**
- "Add Entity" button → modal: name, type, aliases (comma-sep), properties (key-value pairs)
- "Add Relation" button → modal: source entity, target entity, relation type, strength slider, context

**API:**
- `GET /api/knowledge/entities` — list entities (query: `type`, `search`)
- `GET /api/knowledge/entities/[id]` — entity detail + relations
- `POST /api/knowledge/entities` — create/update entity
- `POST /api/knowledge/relations` — create relation
- `GET /api/knowledge/graph` — full graph data (nodes + edges) for visualization

---

### `/mistakes` — Mistake Tracker
Learn from errors. Track recurrence. Don't repeat.

**Mistake list:**
- Description, agent badge, severity (S1-S5 color-coded)
- Recurrence count (×1, ×2, ×3... — highlight ×3+ in red)
- Lesson learned (if set, shown as quote block)
- Last occurred timestamp
- Resolved/unresolved toggle

**Filters:** Agent, unresolved only, severity range

**Summary bar:**
- Total mistakes, unresolved count, most recurring, worst severity

**Actions:**
- "Log Mistake" button → modal: description, agent, context, lesson, severity (1-5)
- Resolve toggle
- Edit lesson learned inline

**API:**
- `GET /api/mistakes` — list mistakes (query: `agent`, `unresolved`, `severity`)
- `POST /api/mistakes` — log mistake
- `PATCH /api/mistakes/[id]` — resolve, update lesson

---

### `/reactions` — Reaction Matrix
Agent-to-agent trigger rules. When X happens in agent A, agent B does Y.

**Matrix view (desktop):**
- Table: rows = trigger agent, columns = responder agent
- Cell = event types that link them (click to expand)
- Color intensity = number of rules

**List view (mobile default):**
- Per rule card: `Nefario:research_complete → Kevin:notify (p=1.0)`
- Trigger agent emoji → event type → responder agent emoji → action
- Probability shown as percentage pill
- Enabled/disabled toggle

**Actions:**
- "Add Rule" button → modal: trigger agent, event type, responder, action, probability slider, filter JSON (advanced)
- Enable/disable toggle
- Delete rule (confirm)

**API:**
- `GET /api/reactions` — list rules (query: `agent`, `enabled`)
- `POST /api/reactions` — create rule
- `PATCH /api/reactions/[id]` — update (enable/disable, probability)
- `DELETE /api/reactions/[id]` — remove rule

---

### `/costs` — Cost Tracker
Monthly spend overview. All costs in EUR.

**KPI cards (top):**
- 💰 Total monthly cost (€201.11)
- 🤖 OpenClaw-related cost (€164.29)
- 📈 Trend vs last month (% change)
- 💱 Current USD/EUR rate (from ECB)

**Subscription table:**
- Service name, monthly cost (original currency + EUR), billing cycle, category
- Sortable by cost
- Total row at bottom

**Cost snapshots chart:**
- Line/area chart (Recharts): daily/hourly cost over time
- Toggle: 24h / 7d / 30d view

**FX rate chart:**
- USD/EUR rate over time (from `ops.fx_rates`)

**API:**
- `GET /api/costs/subscriptions` — list subscriptions
- `GET /api/costs/snapshots` — cost snapshots (query: `period=24h|7d|30d`)
- `GET /api/costs/fx` — FX rate history
- `POST /api/costs/subscriptions` — add/update subscription

---

### `/compounds` — Memory Compounds
Weekly memory synthesis — distilled learnings from daily notes.

**Compound list (reverse chronological):**
- Period: "03/02 → 09/02/2026"
- Summary (truncated, expand on tap)
- Key learnings (bullet list)
- Mistakes (bullet list, linked to `/mistakes`)
- Agent badge

**Actions:**
- "Generate Compound" button → triggers synthesis for a date range (calls agent)

**API:**
- `GET /api/compounds` — list compounds
- `POST /api/compounds/generate` — trigger synthesis (body: `{ from, to, agent }`)

---

## Updated API routes (complete list)

### Data endpoints (Prisma)
- `GET /api/agents` — list agents with stats ✅
- `GET /api/agents/[id]` — agent detail + recent events
- `POST /api/agents/[id]/review` — submit review
- `POST /api/agents/[id]/promote` — level up (with reason)
- `POST /api/agents/[id]/demote` — level down (with reason)
- `GET /api/workflows` — list workflows
- `POST /api/workflows/[id]/run` — trigger run
- `GET /api/runs` — list runs (with filters) ✅
- `GET /api/runs/[id]` — run detail + steps
- `GET /api/events` — event feed (paginated, filterable) ✅
- `GET /api/priorities` — shared priority stack
- `POST /api/priorities` — signal entity
- `PATCH /api/priorities/[id]` — resolve/unresolve
- `GET /api/knowledge/entities` — list entities
- `GET /api/knowledge/entities/[id]` — entity detail + relations
- `POST /api/knowledge/entities` — add/update entity
- `POST /api/knowledge/relations` — add relation
- `GET /api/knowledge/graph` — graph visualization data
- `GET /api/mistakes` — list mistakes
- `POST /api/mistakes` — log mistake
- `PATCH /api/mistakes/[id]` — update/resolve
- `GET /api/reactions` — list reaction rules
- `POST /api/reactions` — add rule
- `PATCH /api/reactions/[id]` — update rule
- `DELETE /api/reactions/[id]` — remove rule
- `GET /api/costs/subscriptions` — list subscriptions
- `GET /api/costs/snapshots` — cost history
- `GET /api/costs/fx` — FX rate history
- `GET /api/compounds` — memory compounds

### Special endpoints (raw SQL for vector/system)
- `POST /api/memory/search` — vector similarity search (body: `{ query, limit }`)
- `GET /api/memory/stats` — DB size, memory count, embedding stats
- `GET /api/system/health` — CPU, RAM, disk, PG stats, OpenClaw status ✅

---

## Updated nav structure

**Sidebar / bottom nav items:**
1. 🏠 Overview (`/`)
2. 🤖 Agents (`/agents`)
3. 📡 Priorities (`/priorities`)
4. 🔵 Knowledge (`/knowledge`)
5. 📋 Workflows (`/workflows`)
6. 🏃 Runs (`/runs`)
7. 🧠 Memory (`/memory`)
8. 📊 Events (`/events`)
9. 💰 Costs (`/costs`)
10. ⚠️ Mistakes (`/mistakes`)
11. ⚡ Reactions (`/reactions`)
12. 🖥️ System (`/system`)

**Mobile:** Bottom nav shows top 5 (Overview, Agents, Priorities, Memory, System) + hamburger for rest

---

## Updated priority order (build sequence)
1. ✅ Layout shell (sidebar/bottom nav, dark theme, shadcn setup)
2. ✅ `/` Overview with KPI cards + agent strip
3. ✅ `/agents` list + `/agents/[id]` detail
4. ✅ `/system` server health
5. ✅ `/events` feed
6. ✅ `/runs` + `/runs/[id]`
7. ✅ `/workflows`
8. ✅ `/memory` browser
9. `/costs` — cost tracker (uses existing `ops.subscriptions` + `ops.cost_snapshots`)
10. `/priorities` — shared priority stack
11. `/knowledge` — entity graph
12. `/mistakes` — error tracker
13. `/reactions` — reaction matrix
14. `/compounds` — memory synthesis
15. Missing API routes (see checklist above)

---

## Agent Coordination

Multi-agent file conflict prevention and activity tracking.

### File Claims (`ops.file_claims`)

Agents claim files before editing to avoid conflicts. Postgres-enforced uniqueness via partial unique index on active claims (where `released_at IS NULL`). Stale claims auto-released after 2h by watchdog.

**Schema:**
- `id` — bigint PK
- `agent_id` — text, not null
- `file_path` — text, not null
- `description` — text (optional)
- `claimed_at` — timestamptz, default now()
- `released_at` — timestamptz (NULL = active)

**Indexes:**
- `idx_file_claims_unique_active` — UNIQUE on (file_path, agent_id) WHERE released_at IS NULL
- `idx_file_claims_active` — btree on file_path WHERE released_at IS NULL
- `idx_file_claims_agent` — btree on agent_id WHERE released_at IS NULL

**CLI:** `tools/file-claim.mjs` — commands: `claim`, `release`, `release-all`, `check`, `active`

### Git Post-Commit Hook

Shared hook (`scripts/git-post-commit-hook.sh`) symlinked to all repos. Auto-logs commits to `ops.agent_events` with hash, message, changed files, and repo name. Agent resolved from `memory.agent_profiles` DB lookup (no hardcoded list), fallback to git author.

### Event Types in `ops.agent_events`

- **commit** — auto-logged by git post-commit hook
- **task_start** — logged by task-tracker when a task begins
- **task_complete** — logged by task-tracker on success
- **task_fail** — logged by task-tracker on failure
- **task_stalled** — logged by watchdog when a task exceeds its timeout

### Watchdog Enhancements

`scripts/task-watchdog.mjs` now also:
- Releases stale file claims (>2h old)
- Logs `task_stalled` events for timed-out tasks

---

## Out of scope (for now)
- Real-time WebSocket
- Multi-user / roles
- Notifications from dashboard
- Editing workflows from UI (use YAML files + CLI)
- Graph visualization library (list view first, graph later)
