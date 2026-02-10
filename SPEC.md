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

## Out of scope (for now)
- Auth (Tailscale is the auth perimeter)
- Real-time WebSocket
- Multi-user / roles
- Notifications from dashboard
- Editing workflows from UI (use YAML files + CLI)
