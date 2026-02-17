# Feature Request: Task Checklist / Subtasks System

**Status:** planned
**Priority:** high
**Requested by:** Boss
**Date:** 17/02/2026

## Problem

Large tasks (like KB Bookmarks) span multiple steps and often timeout or crash mid-work. When this happens:
- We don't know what was completed vs pending
- Respawning requires starting from scratch or manual investigation
- No visibility into progress (just "running" for hours)

## Proposed Solution

Add a checklist/subtasks system to task_queue:

### Database Schema (draft)
```sql
CREATE TABLE ops.task_checklist (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES ops.task_queue(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dashboard UI
- Task detail sheet shows checklist with checkboxes
- Progress indicator (3/7 steps done)
- Ability to manually mark steps done/skip

### Agent Integration
- Spawn prompts include pending steps
- Agent marks steps done on completion
- Next spawn picks up from last completed step

## Benefits
- Crash recovery — pick up where left off
- Progress visibility — see 3/7 not just "running"
- Better handoffs — clear state between agents

## Implementation Steps
1. [ ] Detailed spec (Nefario/Opus)
2. [ ] Stuart: Create schema
3. [ ] Bob: Build UI
4. [ ] Kevin: Update spawn workflow

## Notes
Awaiting detailed spec from Nefario.
