# SPEC: Overview Page Redesign

## Context
Dashboard at `/home/shad/projects/oclaw-ops/dashboard` (Next.js 16, Tailwind, Radix UI, Prisma, dark theme zinc-900).

## Changes Required

### 1. Remove "Kevin Status" KPI card and "Tasks Completed" KPI card
**File:** `src/components/dashboard/kpi-cards.tsx`
- Delete the "Kevin Status" card (first card)
- Delete the "Tasks Completed" card (third card)
- **Keep ONLY the "Server Load" card** but make it a compact inline element (not a card) — see step 2

### 2. Redesign page header in `src/components/dashboard/dashboard-client.tsx`
Current header is just an h2 title + subtitle. Replace it with a **compact title row**:

```
[🍌 Minions Control]  [🟢 Online · 48.2h]  [CPU 3.2% · Mem 4.1GB]
subtitle text below
```

Specifically:
- Title "Minions Control" stays (gold color, same font)
- **Right after title**, add a small status badge: green dot + "Online" + uptime (from `kevinStatus`)
  - If offline: red dot + "Offline"
- **Next to that**, a compact server load indicator: `CPU X.X% · Mem X.XGB` in muted zinc-500 text
  - No sparkline chart needed here (the sparkline still lives in the system page)
- Subtitle stays below as-is
- All on one row (flex, items-center, gap-3), wraps on mobile

### 3. Remove `KPICards` component usage entirely
- Remove the `<KPICards>` from `dashboard-client.tsx`
- Remove `kevinStatus` and `completedTasks` from `initialData` and the server page.tsx
- Remove `completedTasks` DB query from `src/app/(dashboard)/page.tsx`
- Keep `serverLoad` data but pass it to the header area instead
- Keep `kevinStatus` data for the status badge
- You can keep the kpi-cards.tsx file but it won't be imported anymore

### 4. New Sub-Agent Monitor Widget
**New file:** `src/components/dashboard/subagent-monitor.tsx`

This replaces the space freed up by removing KPI cards. Place it in the grid **between CostCard and the ActiveTasks/MemoryIntegrity row**.

**New API route:** `src/app/api/agents/sessions/route.ts`
- Calls the OpenClaw CLI to list sessions: `openclaw sessions list --json` (or reads from the gateway API)
- Actually, simpler: query `ops.agent_events` for recent `task_start` events where `detail->>'spawned_by'` exists or `agent_id` matches known sub-agents (bob, nefario, xreader)
- For now, query `ops.agent_events` with `event_type = 'task_start'` in last 24h, grouped by agent, and check for matching `task_complete`/`task_fail` events

The widget shows:
- **Title:** "Sub-Agents" with a Users icon
- **List of recent sub-agent runs** (last 24h):
  - Agent avatar + name
  - Task description (from `detail.task`)
  - Spawned by (from `detail.spawned_by`, default "Kevin")  
  - Model used (from `detail.model`)
  - Duration or "Running for Xm" if no completion event
  - Status: 🟢 Completed / 🔵 Running / 🔴 Failed / 🧟 Zombie
- **Zombie detection:** If a task_start has no completion AND is older than 30 minutes → show as Zombie with a skull icon and a "Kill" button (disabled for now, tooltip "Coming soon")
- **Empty state:** "No sub-agent activity in the last 24h"
- Auto-refresh every 30s

### 5. Updated layout in dashboard-client.tsx

New order:
```tsx
<DataRefresh />

{/* Compact header row with status badges */}
<div className="flex items-center gap-3 flex-wrap">
  <h2 ...>Minions Control</h2>
  <StatusBadge status={kevinStatus} />
  <ServerLoadBadge cpu={...} memory={...} />
</div>
<p className="text-sm text-zinc-500 mb-4">subtitle</p>

<CostCard />

<div className="grid gap-4 md:grid-cols-2">
  <SubAgentMonitor />
  <div className="space-y-4">
    <ActiveTasks />
    <MemoryIntegrity />
  </div>
</div>

{/* Minions strip */}
<div className="space-y-4">
  <h3>Minions</h3>
  <AgentStrip agents={enrichedAgents} />
</div>

{/* Activity + Live Status */}
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-8"><ActivityFeed /></div>
  <div className="col-span-4"><AgentLiveStatus /></div>
</div>
```

## Files to Edit
1. `src/app/(dashboard)/page.tsx` — remove completedTasks query, keep serverLoad + kevinStatus
2. `src/components/dashboard/dashboard-client.tsx` — new layout, remove KPICards import, add inline status badges
3. `src/components/dashboard/kpi-cards.tsx` — can leave file but remove import (or delete file)
4. **NEW** `src/components/dashboard/subagent-monitor.tsx` — sub-agent monitor widget
5. **NEW** `src/app/api/agents/sessions/route.ts` — API for sub-agent activity data

## Design Notes
- Dark theme: bg-zinc-900/50, border-zinc-800, text-white/zinc-400/zinc-500
- Status badge: small rounded pill with dot, like the ones in agent-live-status.tsx
- Server load badge: just text, no card border
- Sub-agent monitor: same Card style as other widgets
- Zombie row: subtle red-ish bg tint (red-500/5), skull emoji
- Model chip: small colored dot matching model-display-config colors (red=Opus, green=Gemini, yellow=Grok, blue=GPT)

## DB Schema Reference
```sql
-- ops.agent_events
id bigint PK
agent_id text
event_type text  -- 'task_start', 'task_complete', 'task_fail', 'error', etc.
detail jsonb     -- { task: "...", model: "...", spawned_by: "...", ... }
tokens_used int
cost_usd numeric
created_at timestamptz
```

## Prisma model name
`agent_events` (in the `ops` schema, mapped via `@@schema("ops")`)

## Important
- Do NOT touch Prisma schema
- Do NOT create new Prisma models
- Use existing `prisma.agent_events` for all queries
- Test that TypeScript compiles: `npx next build` (or at least `npx tsc --noEmit`)
- Keep all existing functionality (CostCard, ActiveTasks, MemoryIntegrity, AgentStrip, ActivityFeed, AgentLiveStatus)
