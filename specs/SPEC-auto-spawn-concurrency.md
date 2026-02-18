# SPEC: Auto-Spawn Agents + Concurrency Management

**Created:** 2026-02-15
**Status:** Draft
**Priority:** High — core workflow improvement

## Problem

Currently, when Boss drags a task to "running" in Kanban:
1. Ack-watcher marks it as acked ✅
2. But no agent is auto-spawned ❌
3. Kevin must manually spawn agents

This creates delays and requires Kevin to be online.

## Solution

### 1. Auto-Spawn on Running

When a task enters `running` status:
1. Check if under concurrency limit
2. If yes → spawn appropriate agent immediately
3. If no → move to new `queued` status (waiting for slot)

### 2. New Status: `queued`

```
planned → running → (work) → review → done
              ↓
           queued (at capacity, waiting for slot)
```

- Task is ready to run but waiting for agent capacity
- Auto-promoted to `running` when slot opens
- Visual indicator in Kanban: amber/orange border + queue position badge

### 3. Concurrency Limits

**Settings (stored in DB or config):**
```json
{
  "maxConcurrentAgents": 6,
  "perModelLimits": {
    "gemini": 4,
    "sonnet": 3,
    "grok": 2,
    "opus": 1
  }
}
```

**Recommended defaults based on server:**

| Server Class | Cores | RAM | Max Agents | Notes |
|--------------|-------|-----|------------|-------|
| Low-end VPS | 2 | 4GB | 2-3 | Careful with Opus |
| Mid VPS | 4 | 8GB | 4-6 | Good balance |
| High VPS | 8 | 16GB+ | 6-10 | Current server |
| Dedicated | 16+ | 32GB+ | 10-16 | Heavy workloads |

**This VPS (8 cores, 22GB):** Recommended 6-8 concurrent agents.

### 4. Agent Selection Logic

When spawning, Kevin decides model based on task:
- `priority >= 7` or `speced: true` → Sonnet/Grok
- `priority >= 4` → Gemini
- `priority <= 3` or labeled "simple" → Gemini
- `agent_id` already set → use that agent's default model

Could also read from task's `model` field if set.

### 5. Queue Management

**When slot opens (agent finishes):**
1. Query `SELECT * FROM ops.task_queue WHERE status = 'queued' ORDER BY priority DESC, created_at ASC LIMIT 1`
2. Move to `running`
3. Spawn agent

**Priority in queue:**
- Higher priority tasks get slots first
- FIFO within same priority level

### 6. Implementation Components

#### A. Database Changes
```sql
-- Add queued to status check constraint
ALTER TABLE ops.task_queue 
DROP CONSTRAINT task_queue_status_check,
ADD CONSTRAINT task_queue_status_check 
CHECK (status = ANY (ARRAY['queued', 'backlog', 'planned', 'running', 'review', 'human_todo', 'done', 'failed', 'cancelled']));

-- Settings table (if not exists)
CREATE TABLE IF NOT EXISTS ops.agent_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO ops.agent_settings (key, value) VALUES
('concurrency', '{"maxAgents": 6, "perModel": {"gemini": 4, "sonnet": 3, "grok": 2, "opus": 1}}');
```

#### B. Auto-Spawn Watcher (cron job or systemd service)

Every 10-30s:
1. Count running agents: `SELECT COUNT(*) FROM ops.live_sessions WHERE is_active AND kind = 'subagent'`
2. Get max from settings
3. If under limit + queued tasks exist → spawn next
4. If task just entered running (acked=false) + under limit → spawn immediately

#### C. Dashboard UI Changes
- New "queued" column OR badge on planned tasks
- Settings page: concurrency limits editor
- Visual queue position indicator

#### D. Kevin's Spawn Logic
- Read task description/priority
- Select appropriate model
- Call `sessions_spawn` with task context
- Update task with `session_key` for tracking

### 7. Monitoring

**Dashboard additions:**
- Active agents count vs limit (e.g., "4/6 agents running")
- Queue depth indicator
- Per-model usage bars

### 8. Future Enhancements

- **Cost-aware limits:** Factor in $/hour per model
- **Time-based limits:** Lower limits during quiet hours
- **Priority preemption:** High-priority task can pause lower ones
- **Agent pooling:** Reuse warm sessions instead of spawning fresh

## Acceptance Criteria

- [ ] Tasks auto-spawn when moved to running (under limit)
- [ ] Queued status works when at capacity
- [ ] Auto-promotion from queue when slot opens
- [ ] Settings page shows/edits concurrency limits
- [ ] Dashboard shows active/max agent count
- [ ] Works with existing ack-watcher

## Estimated Complexity

🟡 Medium — DB changes, new watcher script, dashboard UI updates

## Dependencies

- Ack-watcher already exists (can extend)
- live_sessions table tracks active agents
- Dashboard settings page (may need creation)
