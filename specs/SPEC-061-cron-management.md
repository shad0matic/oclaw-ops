# SPEC-061: Cron Management Module in MC Dashboard

**Task ID:** #61  
**Type:** Feature  
**Priority:** P8  
**Status:** Complete  
**Requested By:** Boss (13/02/2026)  
**Completed:** 20/02/2026  

---

## Overview

Full cron management page in MC Dashboard to view, create, edit, and monitor OpenClaw Gateway cron jobs.

---

## Current State

- `/crons` page exists with basic DataTable
- Shows job list from `/api/cron/jobs`
- Can toggle enable/disable
- Can trigger manual run
- Can view run history

**Missing:**
- Create new job UI
- Edit job UI
- Delete job
- Schedule builder (visual cron expression)
- Job templates
- Run log viewer (real-time)

---

## Phase 1: CRUD Operations

### Create Job Dialog

Button: "+ New Job" in page header

Fields:
- **Name** (required) — human-readable identifier
- **Schedule Type** — radio: At (one-shot) / Every (interval) / Cron (expression)
- **Schedule Config**:
  - At: datetime picker (ISO format)
  - Every: interval input (ms or human: "30m", "1h")
  - Cron: expression input with helper
- **Timezone** — dropdown (default: Europe/Paris)
- **Session Target** — radio: Main / Isolated
- **Payload Type**:
  - systemEvent (main only): text input
  - agentTurn (isolated only): message + optional model
- **Enabled** — checkbox (default: true)

### API
```
POST /api/cron/jobs
Body: { name, schedule, payload, sessionTarget, enabled }
```

Uses Gateway `cron` tool with `action: add`.

---

### Edit Job Dialog

Click row or edit icon → opens prefilled dialog

Same fields as Create, plus:
- Last run info
- Total runs count
- Success/failure rate

### API
```
PATCH /api/cron/jobs/:id
Body: { patch object }
```

Uses Gateway `cron` tool with `action: update`.

---

### Delete Job

Confirmation dialog: "Delete job 'X'? This cannot be undone."

### API
```
DELETE /api/cron/jobs/:id
```

Uses Gateway `cron` tool with `action: remove`.

---

## Phase 2: Visual Schedule Builder

### Cron Expression Helper

For `kind: cron`:
- Visual grid: minute / hour / day / month / weekday
- Common presets: "Every hour", "Daily at 9am", "Weekdays at 8am"
- Human-readable preview: "Runs every day at 09:00 Europe/Paris"
- Expression validation with error messages

### Interval Builder

For `kind: every`:
- Slider or input for interval
- Presets: 5min, 15min, 30min, 1h, 6h, 12h, 24h
- Anchor time picker (when to start counting)

---

## Phase 3: Run Monitoring

### Run History Enhancements

Current: basic list with status badge

Add:
- **Log viewer**: expandable pre block with syntax highlighting
- **Duration chart**: sparkline of recent run durations
- **Error highlighting**: failed runs show error message prominently
- **Re-run button**: trigger same job immediately
- **Filter**: show only failed / succeeded / all

### Real-time Status

While job is running:
- Spinner on the row
- Auto-refresh until complete
- Toast notification on completion

---

## Phase 4: Job Templates

Pre-built job configurations for common use cases:

| Template | Description | Schedule | Payload |
|----------|-------------|----------|---------|
| Daily Standup | Morning briefing | 08:00 weekdays | agentTurn: "What's on my schedule today?" |
| Weekly Review | Week summary | Friday 17:00 | agentTurn: "Summarize this week's tasks" |
| Backup Reminder | Check backups ran | 04:00 daily | systemEvent: "Verify backup completed" |
| Cost Check | Budget alert | 12:00 daily | agentTurn: "Check API costs vs budget" |

"Use Template" button → prefills Create dialog

---

## Phase 5: Bulk Operations

- Select multiple jobs (checkboxes)
- Bulk enable/disable
- Bulk delete (with confirmation)
- Export selected as JSON
- Import from JSON

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Cron Jobs                              [+ New Job]      │
├─────────────────────────────────────────────────────────┤
│ ☐ | Name          | Schedule      | Next Run | Status  │
│ ☐ | Daily backup  | 0 3 * * *     | 2h       | ✅      │
│ ☐ | Cost snapshot | */5 * * * *   | 3m       | ✅      │
│ ☐ | Weekly digest | 0 9 * * 1     | 5d       | ⏸️      │
├─────────────────────────────────────────────────────────┤
│ [Bulk: Enable | Disable | Delete]                       │
└─────────────────────────────────────────────────────────┘
```

Row click → opens detail panel (not full page):
- Job info
- Run history
- Edit/Delete buttons

---

## API Summary

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | /api/cron/jobs | List all jobs |
| POST | /api/cron/jobs | Create job |
| GET | /api/cron/jobs/:id | Get job details |
| PATCH | /api/cron/jobs/:id | Update job |
| DELETE | /api/cron/jobs/:id | Delete job |
| POST | /api/cron/jobs/:id/run | Trigger immediate run |
| GET | /api/cron/jobs/:id/runs | Get run history |

All endpoints proxy to Gateway `cron` tool.

---

## Implementation Order

1. **Delete job** — simplest CRUD addition
2. **Create job** — basic dialog without visual builder
3. **Edit job** — reuse create dialog
4. **Cron helper** — visual expression builder
5. **Run log viewer** — enhance history display
6. **Templates** — presets library
7. **Bulk ops** — power user features

---

## Success Criteria

- [x] Can create new cron job from UI
- [x] Can edit existing job
- [x] Can delete job with confirmation
- [x] Visual cron builder works
- [x] Run history shows logs
- [x] At least 3 job templates available
