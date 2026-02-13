# Kanban v3 — Full Spec

**Author:** Kevin 🍌 (Opus)
**Date:** 13/02/2026
**Status:** Draft for Boss review

---

## Problem Statement

The kanban board exists but has critical gaps:
1. **Status mismatch** — DB stores `queued`, UI maps to `backlog`, buttons check wrong value ✅ (fixed today)
2. **No agent assignment flow** — "Run" sets status but doesn't assign anyone
3. **No activity tracking** — running tasks show no progress or timeline
4. **No connection to agent_events** — work happens invisibly
5. **Watcher is blind** — kanban-watcher detects unassigned tasks but can't see progress
6. **Detail sheet is bare** — no timeline, no sub-tasks, no cost, no agent picker
7. **No delete/edit** — can't fix typos or remove junk tasks from the UI
8. **Priority sorting wrong** — `ORDER BY priority DESC` but lower number = higher priority
9. **Mobile DnD broken** — react-dnd HTML5 backend doesn't work on touch devices

---

## Phase 1: Fix Foundation (Bob on Gemini — ~1h)

### 1A. Priority sort fix
- **API** `GET /api/tasks/queue`: Change `q.priority DESC` → `q.priority ASC`
- All queries that sort by priority need ASC (lower = more urgent)

### 1B. Agent assignment on "Run"
- **Detail sheet**: Add agent picker dropdown before Run button
  - Dropdown lists agents from `memory.agent_profiles` (GET `/api/agents` already exists)
  - When "▶️ Run" clicked → sends `{ action: "run", agentId: "bob" }`
  - API already supports agentId in the run action? **No** — need to update PATCH handler:
    ```sql
    UPDATE ops.task_queue SET status = 'running', agent_id = $2, started_at = now() WHERE id = $1
    ```
  - If no agent selected, still allow Run (Kevin picks it up via watcher)

### 1C. Agent avatar on cards + detail sheet
- **Compact card**: Already shows avatar when `agent_id` exists ✅
- **Detail sheet header**: Show agent avatar + name prominently (Bob is already working on this)
- **Column header**: Show count of tasks per agent as tiny avatars

### 1D. Edit task inline
- **Detail sheet**: Make title editable (click → input, blur → save)
- **Detail sheet**: Make description editable (textarea)
- **Detail sheet**: Priority picker (1-9 buttons or dropdown)
- **Detail sheet**: Project picker dropdown
- **API**: Add generic update to PATCH handler:
  ```
  action: "update", fields: { title, description, priority, project, agent_id }
  ```

### 1E. Delete task
- **Detail sheet footer**: Red "🗑️ Delete" button (with confirm)
- **API**: DELETE already exists at `/api/tasks/queue/[id]` ✅

### 1F. Mobile touch support
- Replace `react-dnd` HTML5Backend with `react-dnd-touch-backend` for mobile
- Or: Use buttons-only flow on mobile (no drag, just click card → action buttons)
- **Recommendation**: Buttons-only on mobile (simpler, more reliable)

---

## Phase 2: Activity Timeline (Bob on Gemini — ~2h)

### 2A. Link agent_events to tasks
- **Schema change** (Stuart or raw SQL):
  ```sql
  ALTER TABLE ops.agent_events ADD COLUMN task_id bigint REFERENCES ops.task_queue(id);
  CREATE INDEX idx_agent_events_task ON ops.agent_events(task_id) WHERE task_id IS NOT NULL;
  ```
- Update `task-tracker.mjs` to include task_id when logging task_start/task_complete
- Update kanban-watcher to log events with task_id

### 2B. Timeline in detail sheet
- **New API**: `GET /api/tasks/queue/[id]/timeline`
  ```sql
  SELECT event_type, agent_id, detail, created_at
  FROM ops.agent_events
  WHERE task_id = $1
  ORDER BY created_at ASC
  ```
- **Detail sheet**: Add collapsible "Activity" section showing timeline:
  - 🟢 Created (created_at)
  - 📋 Planned (when status changed to planned)
  - 👤 Assigned to Bob (when agent_id set)
  - ▶️ Started (started_at)
  - 💬 "Rebuilding component..." (task_progress events)
  - ✅ Completed (completed_at)
- Events rendered as a vertical timeline with dots + timestamps

### 2C. Progress updates from agents
- New event type: `task_progress` in agent_events
  ```json
  { "event_type": "task_progress", "task_id": 29, "detail": { "message": "Built settings form, running tests..." } }
  ```
- Agents can post progress updates during long tasks
- Shows in timeline + as a "latest status" line on the compact card

---

## Phase 3: Smart Dispatch (Kevin on Opus — ~1h)

### 3A. Auto-assignment rules
- Kanban watcher enhanced with assignment logic:
  ```
  project=oclaw-ops + title contains UI/frontend/component → Bob
  project=oclaw-ops + title contains API/script/infra → Kevin
  title contains research/analysis → Nefario
  title contains schema/migration/prisma → Stuart
  default → Kevin
  ```
- When watcher assigns, it also logs `task_assign` event with task_id

### 3B. Auto-spawn on running
- When task moves to "running" AND has agent_id:
  - Watcher alerts Kevin's main session
  - Kevin spawns the right sub-agent with task context
  - Sub-agent gets task description + relevant file paths
- On sub-agent completion:
  - Update task_queue status → 'review' or 'done'
  - Log task_complete event
  - Run `bash scripts/rebuild.sh` if dashboard files changed

### 3C. Stale task detection
- Already in kanban-watcher: tasks running > 10min with no events
- Enhanced: escalate to Boss if stale > 30min
- Auto-fail if stale > 2h (agent probably died)

---

## Phase 4: Dashboard Polish (Bob on Gemini — ~1h)

### 4A. Column improvements
- Show column task count in header
- Color-coded column headers (backlog=grey, planned=blue, running=amber, done=green)
- Collapse "Done" column by default (toggle to expand)
- Done column shows only last 5 tasks + "Show all" link

### 4B. Filters
- Filter by agent (dropdown with avatars)
- Filter by project (already exists ✅)
- Search by title (text input)

### 4C. Bulk actions
- Multi-select cards (checkbox on each)
- Bulk move to status
- Bulk assign agent
- Bulk delete

### 4D. Keyboard shortcuts
- `n` — new task
- `f` — toggle filters
- `1-6` — switch to column (mobile tabs)
- `Esc` — close detail sheet

---

## Phase 5: New Task Creation (Bob on Gemini — ~30min)

### 5A. "New Task" button
- Top-right of kanban board
- Opens a creation sheet with:
  - Title (required)
  - Description (optional, textarea)
  - Project (dropdown from ops.projects)
  - Priority (1-9 picker, default 5)
  - Assign to (optional agent dropdown)
  - Status (default: queued, option: planned)
- POST to `/api/tasks/queue` (already exists ✅)

---

## Implementation Order

| Phase | What | Agent | Model | Est. Time | Priority |
|-------|------|-------|-------|-----------|----------|
| 1A | Priority sort fix | Bob | Gemini | 10min | P1 |
| 1B | Agent assignment on Run | Bob | Gemini | 30min | P1 |
| 1D | Edit task inline | Bob | Gemini | 30min | P2 |
| 1E | Delete task | Bob | Gemini | 10min | P2 |
| 1F | Mobile touch (buttons-only) | Bob | Gemini | 20min | P2 |
| 5A | New Task button | Bob | Gemini | 30min | P2 |
| 2A | Schema: task_id on events | Kevin | SQL | 5min | P2 |
| 2B | Timeline in detail sheet | Bob | Gemini | 1h | P3 |
| 3A | Auto-assignment rules | Kevin | Opus | 30min | P3 |
| 3B | Auto-spawn on running | Kevin | Opus | 30min | P3 |
| 4A | Column polish | Bob | Gemini | 30min | P4 |
| 4B | Filters + search | Bob | Gemini | 30min | P4 |
| 4D | Keyboard shortcuts | Bob | Gemini | 20min | P5 |
| 4C | Bulk actions | Bob | Gemini | 1h | P5 |

**Total estimated: ~7h of agent work, mostly Bob on Gemini (cheap)**

---

## DB Changes Required

```sql
-- Phase 2A: Link events to tasks
ALTER TABLE ops.agent_events ADD COLUMN IF NOT EXISTS task_id bigint REFERENCES ops.task_queue(id);
CREATE INDEX IF NOT EXISTS idx_agent_events_task ON ops.agent_events(task_id) WHERE task_id IS NOT NULL;

-- Phase 1B: Update run action to accept agent_id
-- (API code change only, no schema change needed)
```

---

## Files Affected

**API routes:**
- `src/app/api/tasks/queue/[id]/route.ts` — add "update" action, fix "run" to accept agentId
- `src/app/api/tasks/queue/[id]/timeline/route.ts` — NEW
- `src/app/api/tasks/queue/route.ts` — fix priority sort

**Components:**
- `src/components/kanban/task-detail-sheet.tsx` — agent picker, edit fields, timeline, delete
- `src/components/kanban/compact-card.tsx` — progress status line
- `src/components/kanban/column.tsx` — column styling, done collapse
- `src/components/kanban/new-task-sheet.tsx` — NEW
- `src/app/(dashboard)/tasks/page.tsx` — new task button, search, keyboard shortcuts

**Scripts:**
- `scripts/kanban-watcher.mjs` — auto-assignment, auto-spawn alerts
- `tools/task-tracker.mjs` — include task_id in events

---

## Open Questions for Boss

1. **Review flow** — Do you want a review step before "done"? Currently agents can mark done directly. We could require your approval for important tasks.
2. **Sub-task support** — Should tasks support parent/child relationships? (e.g., "Overview Redesign" parent with phase sub-tasks)
3. **Notifications** — When a task completes, ping you in Telegram? Or just update the board?
4. **Time tracking** — Track actual time spent per task? (started_at → completed_at already gives wall time)
