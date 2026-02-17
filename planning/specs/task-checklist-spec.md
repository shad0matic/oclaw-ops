# Task Checklist / Subtasks System — Technical Specification

**Version:** 1.0  
**Date:** 2026-02-17  
**Authored by:** Nefario (Research / Spec)  
**For:** Stuart (schema), Bob (UI), Kevin (integration)  
**Status:** Ready for implementation  
**Feature request:** `planning/feature-requests/task-checklist-subtasks.md`

---

## Table of Contents

1. [Problem & Motivation](#1-problem--motivation)
2. [Design Goals & Non-Goals](#2-design-goals--non-goals)
3. [Database Schema Design](#3-database-schema-design)
4. [API Endpoints](#4-api-endpoints)
5. [Dashboard UI Components](#5-dashboard-ui-components)
6. [Agent Integration](#6-agent-integration)
7. [Edge Cases & Business Rules](#7-edge-cases--business-rules)
8. [Migration Path](#8-migration-path)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Problem & Motivation

Large tasks in `ops.task_queue` (e.g. KB Bookmarks processing, bulk research sweeps) frequently:

- **Timeout mid-run** — the agent crashes or hits a context limit. When re-spawned, it has no idea what already happened.
- **Lose progress** — we restart from scratch even when 60% of the work is done.
- **Provide zero visibility** — a task stuck on `running` for 4 hours gives us no information about what's been done.

The existing `progress` JSONB column on `task_queue` is a freeform blob — agents write arbitrary data there, nothing enforces structure, and the dashboard can't render it meaningfully.

**This feature adds a structured, ordered checklist of steps** attached to a task, where each step has a well-defined status lifecycle, timestamps, and an agent attribution. Agents can mark steps done as they go. If the task crashes, the next spawn reads the checklist and continues from the first `pending` step.

---

## 2. Design Goals & Non-Goals

### Goals

- **Crash recovery** — agents always know exactly where to resume from
- **Progress visibility** — dashboard shows `3/7 steps ✓` not just `running`
- **Human override** — Boss/operators can manually tick/skip/reorder steps from the UI
- **Minimal disruption** — bolt-on feature; existing tasks still work without checklists
- **Structured but flexible** — steps are ordered, but `notes` + `metadata` JSONB allow freeform payloads
- **Audit trail** — every step change is timestamped with who did it

### Non-Goals

- **Step dependencies / DAGs** — this is a linear ordered list, not a workflow engine. (We have `ops.steps` for that.)
- **Nested subtasks** — no infinite nesting. One level of steps per task.
- **Branching logic** — steps are either done or skipped; no conditional paths.
- **Real-time streaming** — polling every few seconds is fine; SSE/websocket not needed for this.

---

## 3. Database Schema Design

### 3.1 New Table: `ops.task_checklist`

```sql
-- ============================================================
-- MIGRATION: 0_create_task_checklist.sql
-- Run by: Stuart
-- ============================================================

CREATE TABLE ops.task_checklist (
  id              BIGSERIAL PRIMARY KEY,
  task_id         BIGINT      NOT NULL
                  REFERENCES ops.task_queue(id) ON DELETE CASCADE,
  step_order      INTEGER     NOT NULL,                  -- 1-based; gaps are allowed (10, 20, 30...)
  title           TEXT        NOT NULL,                  -- Short one-liner, shown in UI
  description     TEXT,                                  -- Optional longer instructions for the agent
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'done', 'skipped', 'failed')),
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT,                                  -- agent_id OR 'boss' (manual override)
  notes           TEXT,                                  -- Agent output summary / human annotation
  metadata        JSONB       NOT NULL DEFAULT '{}',     -- Arbitrary payload (file paths, counts, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION ops.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_checklist_updated_at
  BEFORE UPDATE ON ops.task_checklist
  FOR EACH ROW EXECUTE FUNCTION ops.update_updated_at_column();

-- Enforce unique ordering within a task
ALTER TABLE ops.task_checklist
  ADD CONSTRAINT task_checklist_task_order_unique
  UNIQUE (task_id, step_order) DEFERRABLE INITIALLY DEFERRED;
-- DEFERRABLE so we can do a swap reorder in a single transaction

-- Indexes
CREATE INDEX idx_task_checklist_task
  ON ops.task_checklist (task_id, step_order ASC);

CREATE INDEX idx_task_checklist_pending
  ON ops.task_checklist (task_id)
  WHERE status = 'pending';

CREATE INDEX idx_task_checklist_status
  ON ops.task_checklist (status);
```

### 3.2 Column Reference

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `task_id` | BIGINT FK | References `ops.task_queue(id)`, CASCADE DELETE |
| `step_order` | INTEGER | 1-based; use multiples of 10 to allow inserts without reordering |
| `title` | TEXT NOT NULL | Display title, e.g. "Fetch bookmark batch 1–500" |
| `description` | TEXT | Full instructions for the agent; optional |
| `status` | TEXT | `pending` → `running` → `done` \| `skipped` \| `failed` |
| `completed_at` | TIMESTAMPTZ | Set when status → done/skipped/failed |
| `completed_by` | TEXT | Agent ID or `'boss'` for manual ticks |
| `notes` | TEXT | Agent writes summary here (e.g. "processed 487 items") |
| `metadata` | JSONB | Structured output (file paths, batch IDs, counts, error details) |
| `created_at` | TIMESTAMPTZ | Immutable |
| `updated_at` | TIMESTAMPTZ | Auto-maintained by trigger |

### 3.3 Status Lifecycle

```
            ┌──────────────────────────┐
            │         pending          │
            └────────────┬─────────────┘
                         │ agent picks up / manual start
                         ▼
            ┌──────────────────────────┐
            │         running          │ ← only ONE step should be running at a time
            └──────┬───────────┬───────┘
                   │           │
              success        failure / skip / override
                   │           │
            ┌──────▼───┐  ┌───▼──────┐
            │  done    │  │ failed / │
            │          │  │ skipped  │
            └──────────┘  └──────────┘
```

**Transitions:**
- `pending → running` — Agent claims it (or can be implicit: mark it running at step start)
- `running → done` — Agent calls complete
- `running → failed` — Agent reports failure; task should typically also move to `failed`
- `pending → skipped` — Manual override by Boss/operator; agent also allowed to skip
- `done/failed/skipped → pending` — Manual reset ("retry this step")
- `done → pending` — Only via explicit manual override; creates audit event

### 3.4 Relationship to Existing Tables

```
ops.task_queue (id)
       │
       │ 1:many (CASCADE DELETE)
       ▼
ops.task_checklist (task_id)

ops.task_queue.progress JSONB ← retire this field once checklist is established
                                  (migration section covers this)
```

The existing `ops.task_comments` pattern (raw SQL, no Drizzle model yet) is a good reference for how the checklist table should be wired to the API — simple, minimal, works.

### 3.5 Drizzle ORM Schema Addition

**File:** `dashboard/src/lib/schema.ts` (append)

```typescript
export const taskChecklistInOps = ops.table("task_checklist", {
  id:           bigserial({ mode: "bigint" }).primaryKey().notNull(),
  taskId:       bigint("task_id", { mode: "number" }).notNull()
                  .references(() => taskQueueInOps.id, { onDelete: "cascade" }),
  stepOrder:    integer("step_order").notNull(),
  title:        text().notNull(),
  description:  text(),
  status:       text().notNull().default("pending"),
  completedAt:  timestamp("completed_at", { withTimezone: true, mode: "string" }),
  completedBy:  text("completed_by"),
  notes:        text(),
  metadata:     jsonb().notNull().default({}),
  createdAt:    timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (table) => [
  index("idx_task_checklist_task")
    .using("btree", table.taskId.asc(), table.stepOrder.asc()),
  index("idx_task_checklist_pending")
    .using("btree", table.taskId.asc())
    .where(sql`status = 'pending'`),
  check("task_checklist_status_check",
    sql`status = ANY (ARRAY['pending','running','done','skipped','failed'])`),
]);
```

---

## 4. API Endpoints

Pattern follows the existing `ops.task_comments` API (raw Drizzle SQL) and `tasks/queue/[id]` PATCH action pattern. All routes live under `/api/tasks/queue/[id]/checklist/`.

### 4.1 Route Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks/queue/[id]/checklist` | Fetch all steps for a task |
| `POST` | `/api/tasks/queue/[id]/checklist` | Add a new step |
| `PATCH` | `/api/tasks/queue/[id]/checklist/[stepId]` | Update a step (status, notes, reorder) |
| `DELETE` | `/api/tasks/queue/[id]/checklist/[stepId]` | Delete a step (soft-allowed only if pending) |
| `POST` | `/api/tasks/queue/[id]/checklist/bulk` | Bulk-create steps (used by agents on task start) |

### 4.2 GET `/api/tasks/queue/[id]/checklist`

**Response:**
```json
{
  "steps": [
    {
      "id": 42,
      "task_id": 7,
      "step_order": 10,
      "title": "Fetch bookmark batch 1–500",
      "description": "Use x-bookmarks.mjs to pull and store batch 1",
      "status": "done",
      "completed_at": "2026-02-17T09:12:44Z",
      "completed_by": "nefario",
      "notes": "Fetched 487 items, 13 skipped (private)",
      "metadata": { "fetched": 487, "skipped": 13 },
      "created_at": "2026-02-17T08:00:00Z",
      "updated_at": "2026-02-17T09:12:44Z"
    },
    {
      "id": 43,
      "task_id": 7,
      "step_order": 20,
      "title": "Fetch bookmark batch 501–1000",
      "status": "running",
      ...
    }
  ],
  "summary": {
    "total": 7,
    "done": 1,
    "running": 1,
    "pending": 5,
    "skipped": 0,
    "failed": 0
  }
}
```

**Implementation:** `dashboard/src/app/api/tasks/queue/[id]/checklist/route.ts`

```typescript
export const dynamic = "force-dynamic";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });

  const steps = await db.execute(sql`
    SELECT id, task_id, step_order, title, description, status,
           completed_at, completed_by, notes, metadata, created_at, updated_at
    FROM ops.task_checklist
    WHERE task_id = ${taskId}
    ORDER BY step_order ASC
  `);

  const rows = steps.rows as any[];
  const summary = {
    total: rows.length,
    done:    rows.filter(r => r.status === 'done').length,
    running: rows.filter(r => r.status === 'running').length,
    pending: rows.filter(r => r.status === 'pending').length,
    skipped: rows.filter(r => r.status === 'skipped').length,
    failed:  rows.filter(r => r.status === 'failed').length,
  };

  return NextResponse.json({ steps: rows, summary });
}
```

### 4.3 POST `/api/tasks/queue/[id]/checklist`

**Request body:**
```json
{
  "title": "Process batch 2",
  "description": "Optional long instructions",
  "step_order": 20,          // Optional: auto-assigned as max+10 if omitted
  "metadata": {}             // Optional
}
```

**Response:** `201` with the created step row.

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });

  const body = await req.json();
  const { title, description, step_order, metadata = {} } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  // Auto step_order: max existing + 10
  const orderVal = step_order ?? (await db.execute(sql`
    SELECT COALESCE(MAX(step_order), 0) + 10 AS next_order
    FROM ops.task_checklist WHERE task_id = ${taskId}
  `)).rows[0].next_order;

  const result = await db.execute(sql`
    INSERT INTO ops.task_checklist (task_id, step_order, title, description, metadata)
    VALUES (${taskId}, ${orderVal}, ${title.trim()}, ${description ?? null}, ${JSON.stringify(metadata)}::jsonb)
    RETURNING *
  `);

  return NextResponse.json(result.rows[0], { status: 201 });
}
```

### 4.4 PATCH `/api/tasks/queue/[id]/checklist/[stepId]`

**File:** `dashboard/src/app/api/tasks/queue/[id]/checklist/[stepId]/route.ts`

Supports `action`-based mutations:

| Action | Effect |
|---|---|
| `complete` | `status → done`, sets `completed_at`, `completed_by`, optional `notes` |
| `fail` | `status → failed`, sets `completed_at`, `completed_by`, `notes` with error |
| `skip` | `status → skipped`, sets `completed_at`, `completed_by` |
| `start` | `status → running` |
| `reset` | `status → pending`, clears `completed_at`, `completed_by` |
| `update` | Update `title`, `description`, `notes`, `step_order`, `metadata` fields |

**Request body examples:**
```json
// complete
{ "action": "complete", "completed_by": "nefario", "notes": "Done. 487 items.", "metadata": {"count": 487} }

// fail
{ "action": "fail", "completed_by": "nefario", "notes": "Rate limited after 200 items" }

// reorder
{ "action": "update", "fields": { "step_order": 35 } }

// edit title
{ "action": "update", "fields": { "title": "New title" } }
```

**Response:** Updated step row.

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId } = await params;
  const taskId = parseInt(id, 10);
  const sid = parseInt(stepId, 10);
  if (isNaN(taskId) || isNaN(sid)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { action } = body;
  const now = sql`NOW()`;

  switch (action) {
    case "complete":
      await db.execute(sql`
        UPDATE ops.task_checklist SET
          status = 'done', completed_at = NOW(),
          completed_by = ${body.completed_by ?? 'boss'},
          notes = ${body.notes ?? null},
          metadata = COALESCE(metadata, '{}') || ${JSON.stringify(body.metadata ?? {})}::jsonb
        WHERE id = ${sid} AND task_id = ${taskId}
      `);
      break;
    case "fail":
      await db.execute(sql`
        UPDATE ops.task_checklist SET
          status = 'failed', completed_at = NOW(),
          completed_by = ${body.completed_by ?? 'boss'},
          notes = ${body.notes ?? null}
        WHERE id = ${sid} AND task_id = ${taskId}
      `);
      break;
    case "skip":
      await db.execute(sql`
        UPDATE ops.task_checklist SET
          status = 'skipped', completed_at = NOW(),
          completed_by = ${body.completed_by ?? 'boss'},
          notes = ${body.notes ?? null}
        WHERE id = ${sid} AND task_id = ${taskId}
      `);
      break;
    case "start":
      await db.execute(sql`
        UPDATE ops.task_checklist SET status = 'running'
        WHERE id = ${sid} AND task_id = ${taskId}
      `);
      break;
    case "reset":
      await db.execute(sql`
        UPDATE ops.task_checklist SET
          status = 'pending', completed_at = NULL, completed_by = NULL, notes = NULL
        WHERE id = ${sid} AND task_id = ${taskId}
      `);
      break;
    case "update": {
      const allowed = ['title', 'description', 'notes', 'step_order', 'metadata'];
      const fields = Object.entries(body.fields ?? {})
        .filter(([k]) => allowed.includes(k));
      if (fields.length === 0) return NextResponse.json({ error: "no valid fields" }, { status: 400 });
      // Build dynamic SET — use raw SQL for safety
      for (const [field, val] of fields) {
        if (field === 'metadata') {
          await db.execute(sql`UPDATE ops.task_checklist SET metadata = ${JSON.stringify(val)}::jsonb WHERE id = ${sid} AND task_id = ${taskId}`);
        } else if (field === 'step_order') {
          await db.execute(sql`UPDATE ops.task_checklist SET step_order = ${Number(val)} WHERE id = ${sid} AND task_id = ${taskId}`);
        } else {
          // title, description, notes
          await db.execute(sql`UPDATE ops.task_checklist SET ${sql.raw(field)} = ${String(val)} WHERE id = ${sid} AND task_id = ${taskId}`);
        }
      }
      break;
    }
    default:
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const updated = await db.execute(sql`SELECT * FROM ops.task_checklist WHERE id = ${sid}`);
  return NextResponse.json(updated.rows[0]);
}
```

### 4.5 DELETE `/api/tasks/queue/[id]/checklist/[stepId]`

Only allowed if `status = 'pending'`. Returns `409 Conflict` if step is running/done.

```typescript
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId } = await params;
  const taskId = parseInt(id, 10);
  const sid = parseInt(stepId, 10);

  // Guard: don't delete non-pending steps without explicit force flag
  const check = await db.execute(sql`SELECT status FROM ops.task_checklist WHERE id = ${sid} AND task_id = ${taskId}`);
  const step = check.rows[0] as any;
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!['pending', 'skipped', 'failed'].includes(step.status)) {
    return NextResponse.json({ error: "Cannot delete a running or completed step" }, { status: 409 });
  }

  await db.execute(sql`DELETE FROM ops.task_checklist WHERE id = ${sid} AND task_id = ${taskId}`);
  return NextResponse.json({ ok: true });
}
```

### 4.6 POST `/api/tasks/queue/[id]/checklist/bulk`

Used by agents to declare all steps at task-start in one call.

**Request:**
```json
{
  "steps": [
    { "title": "Fetch batch 1–500", "description": "..." },
    { "title": "Fetch batch 501–1000" },
    { "title": "Deduplicate and write to DB" },
    { "title": "Update KB index" }
  ],
  "replace": false   // if true, DELETE existing pending steps first (careful!)
}
```

**Response:** `201` with array of created steps.

The `replace: false` default means calling bulk-create on a task that already has steps will append. Use `replace: true` only when re-planning from scratch (and only if all existing steps are `pending`).

```typescript
// File: dashboard/src/app/api/tasks/queue/[id]/checklist/bulk/route.ts
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  const { steps, replace = false } = await req.json();

  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: "steps array required" }, { status: 400 });
  }

  if (replace) {
    // Only allow if no done/running steps exist
    const active = await db.execute(sql`
      SELECT COUNT(*) as c FROM ops.task_checklist
      WHERE task_id = ${taskId} AND status IN ('done', 'running')
    `);
    if (Number((active.rows[0] as any).c) > 0) {
      return NextResponse.json({ error: "Cannot replace: task has active steps" }, { status: 409 });
    }
    await db.execute(sql`DELETE FROM ops.task_checklist WHERE task_id = ${taskId}`);
  }

  // Get current max step_order
  const maxRes = await db.execute(sql`
    SELECT COALESCE(MAX(step_order), 0) AS m FROM ops.task_checklist WHERE task_id = ${taskId}
  `);
  let order = Number((maxRes.rows[0] as any).m) + 10;

  const created = [];
  for (const step of steps) {
    const r = await db.execute(sql`
      INSERT INTO ops.task_checklist (task_id, step_order, title, description, metadata)
      VALUES (${taskId}, ${order}, ${step.title}, ${step.description ?? null}, ${JSON.stringify(step.metadata ?? {})}::jsonb)
      RETURNING *
    `);
    created.push(r.rows[0]);
    order += 10;
  }

  return NextResponse.json({ steps: created }, { status: 201 });
}
```

### 4.7 Agent Direct PSQL Access (Alternative)

Agents with direct DB access (Kevin, Nefario, etc.) can use psql directly. This is **preferred for agent-side step marking** due to simplicity:

```sql
-- Read pending steps for task 7
SELECT id, step_order, title, description, status
FROM ops.task_checklist
WHERE task_id = 7
ORDER BY step_order ASC;

-- Mark a step as running
UPDATE ops.task_checklist
SET status = 'running'
WHERE id = 42 AND task_id = 7;

-- Mark a step done with notes
UPDATE ops.task_checklist
SET status = 'done',
    completed_at = NOW(),
    completed_by = 'nefario',
    notes = 'Processed 487 items, 13 skipped',
    metadata = metadata || '{"fetched": 487, "skipped": 13}'::jsonb
WHERE id = 42 AND task_id = 7;

-- Find the next pending step for a task
SELECT id, step_order, title, description, metadata
FROM ops.task_checklist
WHERE task_id = 7 AND status = 'pending'
ORDER BY step_order ASC
LIMIT 1;
```

---

## 5. Dashboard UI Components

### 5.1 Overview

The checklist integrates into the existing **TaskDetailSheet** (`components/kanban/task-detail-sheet.tsx`) as a new collapsible section, placed between the Description field and the Chat section.

We also add a compact **progress badge** to the Kanban task cards.

### 5.2 TaskChecklist Component

**File:** `dashboard/src/components/kanban/task-checklist.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, XCircle, SkipForward, Plus, GripVertical, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistStep {
  id: number;
  task_id: number;
  step_order: number;
  title: string;
  description?: string;
  status: "pending" | "running" | "done" | "skipped" | "failed";
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

interface ChecklistSummary {
  total: number;
  done: number;
  running: number;
  pending: number;
  skipped: number;
  failed: number;
}

interface ChecklistData {
  steps: ChecklistStep[];
  summary: ChecklistSummary;
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: ChecklistStep["status"] }) {
  switch (status) {
    case "done":    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case "running": return <Loader2     className="w-4 h-4 text-blue-400 animate-spin shrink-0" />;
    case "failed":  return <XCircle     className="w-4 h-4 text-red-500 shrink-0" />;
    case "skipped": return <SkipForward className="w-4 h-4 text-muted-foreground shrink-0" />;
    default:        return <Circle      className="w-4 h-4 text-muted-foreground/40 shrink-0" />;
  }
}

// ─── Single Step Row ──────────────────────────────────────────────────────────

function StepRow({ step, taskId }: { step: ChecklistStep; taskId: number }) {
  const qc = useQueryClient();

  const patchStep = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const deleteStep = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist/${step.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Cannot delete step");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const isDone = step.status === "done";
  const isActive = step.status === "running";

  return (
    <div className={cn(
      "flex items-start gap-2 py-2 px-1 rounded-md group transition-colors",
      isActive && "bg-blue-500/5 border border-blue-500/20",
      isDone && "opacity-60",
    )}>
      {/* Drag handle — drag-and-drop not in v1, reserved */}
      <GripVertical className="w-3 h-3 text-muted-foreground/20 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />

      {/* Clickable status toggle (pending ↔ done for manual override) */}
      <button
        className="mt-0.5"
        onClick={() => {
          if (step.status === "pending" || step.status === "failed") {
            patchStep.mutate({ action: "complete", payload: { completed_by: "boss" } });
          } else if (step.status === "done") {
            patchStep.mutate({ action: "reset" });
          }
        }}
        title={step.status === "done" ? "Reset step" : "Mark done"}
      >
        <StepIcon status={patchStep.isPending ? "running" : step.status} />
      </button>

      {/* Title + notes */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug",
          isDone && "line-through text-muted-foreground",
        )}>
          {step.title}
        </p>
        {step.notes && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate" title={step.notes}>
            {step.notes}
          </p>
        )}
        {step.completed_by && isDone && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            ✓ by {step.completed_by}
          </p>
        )}
      </div>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-xs">
          {step.status !== "done" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "complete", payload: { completed_by: "boss" } })}>
              ✓ Mark done
            </DropdownMenuItem>
          )}
          {step.status !== "skipped" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "skip", payload: { completed_by: "boss" } })}>
              ↷ Skip
            </DropdownMenuItem>
          )}
          {step.status !== "pending" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "reset" })}>
              ↺ Reset to pending
            </DropdownMenuItem>
          )}
          {["pending", "skipped", "failed"].includes(step.status) && (
            <DropdownMenuItem
              className="text-red-400"
              onClick={() => deleteStep.mutate()}
            >
              🗑 Delete step
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Add Step Form ────────────────────────────────────────────────────────────

function AddStepForm({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const qc = useQueryClient();

  const addStep = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to add step");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", taskId] });
      setTitle("");
      onDone();
    },
  });

  return (
    <div className="flex gap-2 mt-2">
      <Input
        autoFocus
        placeholder="Step title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) addStep.mutate();
          if (e.key === "Escape") onDone();
        }}
        className="h-8 text-sm bg-background/50"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={!title.trim() || addStep.isPending}
        onClick={() => addStep.mutate()}
      >
        Add
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskChecklist({ taskId }: { taskId: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery<ChecklistData>({
    queryKey: ["task-checklist", taskId],
    queryFn: () =>
      fetch(`/api/tasks/queue/${taskId}/checklist`).then((r) => r.json()),
    refetchInterval: 15000, // poll every 15s while sheet is open
  });

  const summary = data?.summary;
  const steps = data?.steps ?? [];
  const progressPct = summary && summary.total > 0
    ? Math.round(((summary.done + summary.skipped) / summary.total) * 100)
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <span>Checklist</span>
        {summary && summary.total > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs font-mono">
            {summary.done + summary.skipped}/{summary.total}
          </Badge>
        )}
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground ml-auto" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-0.5">
          {/* Progress bar */}
          {summary && summary.total > 0 && (
            <div className="pb-2">
              <Progress value={progressPct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {progressPct}% complete
                {summary.failed > 0 && ` · ${summary.failed} failed`}
                {summary.running > 0 && ` · ${summary.running} running`}
              </p>
            </div>
          )}

          {/* Step list */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading...</p>
          ) : steps.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic py-2">
              No steps yet. Add one or let the agent plan them.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} taskId={taskId} />
              ))}
            </div>
          )}

          {/* Add step form */}
          {showAddForm ? (
            <AddStepForm taskId={taskId} onDone={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2 py-1"
            >
              <Plus className="w-3 h-3" /> Add step
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 5.3 Integration into TaskDetailSheet

In `task-detail-sheet.tsx`, insert `<TaskChecklist>` between Description and Chat:

```diff
- {taskId && <TaskComments taskId={taskId} />}
+ {taskId && <TaskChecklist taskId={taskId} />}
+ {taskId && <TaskComments taskId={taskId} />}
```

And import at the top:
```tsx
import { TaskChecklist } from "./task-checklist";
```

### 5.4 Progress Badge on Kanban Cards

Add a small progress indicator to `compact-card.tsx` (and `compact-fr-card.tsx` if needed):

```tsx
// In compact-card.tsx — add a query for checklist summary
// (Only fetch if the card is in a "running" state to minimize API calls)

{task.status === 'running' && <ChecklistProgressBadge taskId={task.id} />}
```

**`ChecklistProgressBadge` component:**

```tsx
function ChecklistProgressBadge({ taskId }: { taskId: number }) {
  const { data } = useQuery({
    queryKey: ["task-checklist-summary", taskId],
    queryFn: () => fetch(`/api/tasks/queue/${taskId}/checklist`).then(r => r.json()),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const s = data?.summary;
  if (!s || s.total === 0) return null;

  return (
    <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-0.5">
      <ListChecks className="w-2.5 h-2.5" />
      {s.done}/{s.total}
    </span>
  );
}
```

> **Bob's note:** Keep card query separate from the sheet query (different query keys) so cards don't trigger a cascade of fetches when many tasks are running. Consider debouncing or only fetching for cards visible in the viewport.

### 5.5 TaskDetailView Integration

In `task-detail-view.tsx` (the full-page detail view, if it exists separately), include the same `<TaskChecklist taskId={taskId} />` component in the appropriate section.

---

## 6. Agent Integration

### 6.1 Philosophy

Agents interact with the checklist using **direct Postgres SQL** (via the `psql` tool or the DB client they already have). The API endpoints are primarily for the dashboard UI. For agent-to-agent coordination, direct SQL is faster, simpler, and avoids needing HTTP auth.

**Critical rule:** An agent should **always** check for existing checklist steps before creating new ones. If steps exist, it means a previous agent already planned the work. Trust the plan.

### 6.2 Task Start Protocol (Agent)

When an agent receives a `task_queue` task, it should follow this protocol:

```sql
-- 1. Check if checklist already exists
SELECT COUNT(*) FROM ops.task_checklist WHERE task_id = $TASK_ID;

-- If 0: This is a fresh start. Create the plan.
-- If > 0: Resume from last completed step (see §6.3).
```

**If creating fresh plan** — either via API bulk-create or direct SQL:

```sql
INSERT INTO ops.task_checklist (task_id, step_order, title, description) VALUES
  ($TASK_ID, 10, 'Initialize: validate inputs and prerequisites', NULL),
  ($TASK_ID, 20, 'Fetch bookmark batch 1–500', 'Use x-bookmarks.mjs --start=1 --end=500'),
  ($TASK_ID, 30, 'Fetch bookmark batch 501–1000', NULL),
  ($TASK_ID, 40, 'Deduplicate entries in staging table', NULL),
  ($TASK_ID, 50, 'Write clean records to bookmarks table', NULL),
  ($TASK_ID, 60, 'Update KB embedding index', NULL),
  ($TASK_ID, 70, 'Verify and report final counts', NULL);
```

### 6.3 Crash Recovery Protocol (Agent)

When a task is re-spawned after a crash:

```sql
-- Find next actionable step
SELECT id, step_order, title, description, metadata
FROM ops.task_checklist
WHERE task_id = $TASK_ID
  AND status IN ('pending', 'failed')    -- skip 'done' and 'skipped'
ORDER BY step_order ASC
LIMIT 1;
```

If a step is in `running` state (left over from a crashed agent), treat it as `pending` — the step was interrupted. Do NOT trust that it completed. Mark it running again or reset it and restart:

```sql
-- Reset interrupted running step
UPDATE ops.task_checklist
SET status = 'pending', completed_at = NULL, completed_by = NULL
WHERE task_id = $TASK_ID AND status = 'running';
```

Then proceed from the first `pending` step.

### 6.4 Step Execution Pattern (Agent)

For each step in sequence:

```sql
-- Mark step as running
UPDATE ops.task_checklist
SET status = 'running'
WHERE id = $STEP_ID AND task_id = $TASK_ID;

-- ... do the work ...

-- On success:
UPDATE ops.task_checklist
SET
  status = 'done',
  completed_at = NOW(),
  completed_by = '$AGENT_ID',
  notes = 'Processed 487 items. 13 skipped (private accounts).',
  metadata = metadata || '{"processed": 487, "skipped": 13}'::jsonb
WHERE id = $STEP_ID AND task_id = $TASK_ID;

-- On failure:
UPDATE ops.task_checklist
SET
  status = 'failed',
  completed_at = NOW(),
  completed_by = '$AGENT_ID',
  notes = 'Error: rate limit hit after item 200. Retry from item 201.'
WHERE id = $STEP_ID AND task_id = $TASK_ID;
```

### 6.5 Task Completion

When all steps are `done` or `skipped`:

```sql
-- Check if done
SELECT COUNT(*) FROM ops.task_checklist
WHERE task_id = $TASK_ID AND status IN ('pending', 'running', 'failed');
-- If 0: all done

-- Then mark parent task complete
UPDATE ops.task_queue
SET status = 'review', completed_at = NOW()
WHERE id = $TASK_ID;
```

Or via API: `PATCH /api/tasks/queue/$TASK_ID` with `{ action: "review" }`.

### 6.6 Kevin's Spawn Prompt Integration

Kevin generates spawn prompts. These should include checklist context. Suggested format for Kevin's prompt builder:

```
## Task Checklist
This task has ${total} steps. Resume from step ${current_order}:

✅ Step 10: Initialize (done by nefario)
✅ Step 20: Fetch batch 1–500 (done — 487 items)
⏳ Step 30: Fetch batch 501–1000  ← START HERE
⬜ Step 40: Deduplicate
⬜ Step 50: Write to DB
⬜ Step 60: Update index
⬜ Step 70: Verify and report

Mark each step done in ops.task_checklist as you complete it.
Use the step ID (e.g., ID=43 for step 30) in your UPDATE query.
```

**Query for Kevin to generate this context:**

```sql
SELECT
  step_order,
  title,
  status,
  notes,
  completed_by,
  id
FROM ops.task_checklist
WHERE task_id = $TASK_ID
ORDER BY step_order ASC;
```

---

## 7. Edge Cases & Business Rules

### 7.1 Task Deletion

The FK has `ON DELETE CASCADE` — deleting a `task_queue` row automatically deletes all its checklist steps. No orphans possible.

**Dashboard guard:** The existing delete confirmation dialog in `TaskDetailFooter` should note "This will also delete N checklist steps." if steps exist.

### 7.2 Step Reordering

Steps use integer ordering with gaps (10, 20, 30...) to allow inserts without full re-numbering.

**Inserting between steps:** Assign `step_order = 15` to place between 10 and 20.

**Swap reorder:** The `UNIQUE (task_id, step_order) DEFERRABLE INITIALLY DEFERRED` constraint allows atomic swaps:

```sql
BEGIN;
UPDATE ops.task_checklist SET step_order = 999 WHERE id = $A;
UPDATE ops.task_checklist SET step_order = 10  WHERE id = $B;
UPDATE ops.task_checklist SET step_order = 20  WHERE id = $A;
COMMIT;  -- constraint checked at commit, not per-statement
```

**Drag-and-drop (v2):** Not in v1. In v2, use a `react-dnd` or `@dnd-kit/sortable` approach and call PATCH with `{ action: "update", fields: { step_order: newOrder } }`.

### 7.3 Manual Overrides

Operators (Boss) can:
- ✅ **Tick a step done** — click the step icon
- ↷ **Skip a step** — dropdown → Skip
- ↺ **Reset a step** — dropdown → Reset to pending
- ✏️ **Edit title** — inline edit (v2; v1 uses dropdown to delete/re-add)

All manual overrides set `completed_by = 'boss'` so agents know not to re-do that step.

**Rule:** Agents must respect steps marked done by `'boss'` — they are intentional. Do not re-run them.

### 7.4 Task Status vs. Checklist Alignment

These are semi-independent. A task can be `running` with all steps `done` (just needs status change). A task can be `queued` with a pre-built checklist (planned ahead).

**Auto-complete task on all steps done:** In v2, we can add a DB trigger or a check in the PATCH handler. In v1, agents are responsible for calling the task-complete API.

**Failing a task mid-checklist:** When an agent marks a step `failed`, it should also call `PATCH /api/tasks/queue/$TASK_ID { action: "fail" }` so Kevin and Boss see it immediately on the Kanban.

### 7.5 Concurrent Agents

Two agents should not work on the same task simultaneously. However, if they do:

- The `status = 'running'` on a step acts as a soft lock
- No hard DB lock is enforced in v1 (acceptable: these scenarios are rare)
- In v2: add a `claimed_by` column to `task_checklist` with a `UNIQUE` constraint on `(task_id, step_order, claimed_by)` WHERE claimed

For now, Kevin's dispatch logic (which assigns `agent_id` on `task_queue`) prevents double-dispatch. Trust that.

### 7.6 Empty Checklist

Tasks without any checklist steps should work exactly as before — no regression. The `TaskChecklist` component renders an empty state, not an error. The Kanban card badge only shows if `total > 0`.

### 7.7 Migrating the `progress` JSONB Field

The existing `task_queue.progress` column is a freeform JSON blob that some agents write to. Once the checklist system is live and adopted:

1. **Phase 1:** Keep `progress` writing as-is. Add checklist in parallel.
2. **Phase 2:** When agents are updated to use checklist, deprecate writes to `progress`.
3. **Phase 3:** Once `progress` is confirmed unused, drop the column (or keep it for arbitrary structured data that doesn't fit the step model).

Do NOT drop `progress` until confirmed all agents have migrated.

---

## 8. Migration Path

### 8.1 Database Migration (Stuart)

**Step 1:** Run the SQL migration in §3.1.

```bash
psql -U openclaw -d openclaw_db -f migrations/0_create_task_checklist.sql
```

**Verify:**
```sql
\d ops.task_checklist
SELECT * FROM ops.task_checklist LIMIT 1; -- empty, that's fine
```

**Step 2:** Add Drizzle schema entry (§3.5) to `schema.ts`. No `drizzle push` needed since the table was created manually — just keep schema.ts in sync.

### 8.2 API Routes (Stuart or Kevin)

Create the following files (all new, no existing code to modify):
- `dashboard/src/app/api/tasks/queue/[id]/checklist/route.ts` (GET, POST)
- `dashboard/src/app/api/tasks/queue/[id]/checklist/[stepId]/route.ts` (PATCH, DELETE)
- `dashboard/src/app/api/tasks/queue/[id]/checklist/bulk/route.ts` (POST)

### 8.3 UI Integration (Bob)

1. Create `dashboard/src/components/kanban/task-checklist.tsx` (full component from §5.2)
2. Import and add `<TaskChecklist taskId={taskId} />` to `task-detail-sheet.tsx`
3. Add `<ChecklistProgressBadge>` to `compact-card.tsx` for running tasks

**Testing checklist:**
- [ ] Open task detail sheet → Checklist section is visible (collapsed by default if no steps)
- [ ] Click "Add step" → form appears → step created → appears in list
- [ ] Click step icon → step toggles done/pending
- [ ] Dropdown → Skip → step shows as skipped
- [ ] Progress bar updates correctly
- [ ] `0/0` badge does NOT appear on cards without steps
- [ ] `2/5` badge appears on running tasks with steps

### 8.4 Agent Integration (Kevin)

Kevin needs to update the spawn workflow to:

1. **On task start:** Check for existing checklist. If present, build and inject the resume-context into the prompt (§6.6).
2. **New task type:** If the task `description` contains `[PLAN]` prefix (convention TBD), Kevin creates the checklist steps from the description bullet points before spawning the agent.
3. **On task completion:** Verify all checklist steps are done before marking task `done`.

**Backwards compatibility:** If `task_checklist` is empty for a task, spawn prompt is unchanged. Zero regression for existing tasks.

### 8.5 Rollout Order

```
Day 1: Stuart creates DB table + Drizzle type
Day 2: Stuart/Kevin adds API routes
Day 3: Bob builds UI component + integrates into sheet
Day 4: Kevin updates spawn prompt builder
Day 5: Test with a real large task (KB Bookmarks or similar)
```

---

## 9. Implementation Checklist

For tracking progress in this very issue:

### Stuart — Schema & API
- [ ] Create `ops.task_checklist` table (SQL in §3.1)
- [ ] Add updated_at trigger
- [ ] Add Drizzle schema entry to `schema.ts` (§3.5)
- [ ] Create `GET /api/tasks/queue/[id]/checklist` (§4.2)
- [ ] Create `POST /api/tasks/queue/[id]/checklist` (§4.3)
- [ ] Create `PATCH /api/tasks/queue/[id]/checklist/[stepId]` (§4.4)
- [ ] Create `DELETE /api/tasks/queue/[id]/checklist/[stepId]` (§4.5)
- [ ] Create `POST /api/tasks/queue/[id]/checklist/bulk` (§4.6)

### Bob — UI
- [ ] Create `task-checklist.tsx` component (§5.2)
- [ ] Integrate into `task-detail-sheet.tsx` (§5.3)
- [ ] Add `ChecklistProgressBadge` to `compact-card.tsx` (§5.4)
- [ ] Test all interactions (add, tick, skip, reset, delete)

### Kevin — Integration
- [ ] Add checklist resume-context to spawn prompt builder (§6.6)
- [ ] Update task-start protocol to check for existing steps (§6.2)
- [ ] Add checklist query to `GET /api/tasks/queue/[id]/detail` response
- [ ] Document new SQL conventions for agents in AGENTS.md

---

## Appendix A: Quick Reference SQL (For Agents)

```sql
-- Create steps for a task
INSERT INTO ops.task_checklist (task_id, step_order, title) VALUES
  ($TASK_ID, 10, 'Step one'),
  ($TASK_ID, 20, 'Step two');

-- Get next pending step
SELECT id, step_order, title, description FROM ops.task_checklist
WHERE task_id = $TASK_ID AND status = 'pending'
ORDER BY step_order ASC LIMIT 1;

-- Mark step running
UPDATE ops.task_checklist SET status = 'running' WHERE id = $STEP_ID;

-- Mark step done
UPDATE ops.task_checklist
SET status = 'done', completed_at = NOW(), completed_by = '$AGENT_ID', notes = '$NOTES'
WHERE id = $STEP_ID;

-- Mark step failed
UPDATE ops.task_checklist
SET status = 'failed', completed_at = NOW(), completed_by = '$AGENT_ID', notes = '$ERROR'
WHERE id = $STEP_ID;

-- Check if all steps are complete
SELECT COUNT(*) FROM ops.task_checklist
WHERE task_id = $TASK_ID AND status NOT IN ('done', 'skipped');
-- Result = 0 means task is fully complete

-- Get full progress summary
SELECT
  COUNT(*) FILTER (WHERE status = 'done')    AS done,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'running') AS running,
  COUNT(*) FILTER (WHERE status = 'failed')  AS failed,
  COUNT(*) FILTER (WHERE status = 'skipped') AS skipped,
  COUNT(*)                                   AS total
FROM ops.task_checklist WHERE task_id = $TASK_ID;
```

---

*End of specification. Questions → ping Nefario or Boss on Telegram.*

---

## 9. Data Retention & Cleanup

### Policy
- **Retention period:** 6 months after parent task reaches `done`, `failed`, or `cancelled`
- **Cleanup scope:** Checklist items cascade-delete when parent task is deleted, but we also need periodic cleanup of old completed tasks

### Implementation Options

#### Option A: Cron job (recommended)
```sql
-- Run monthly via pg_cron or external scheduler
DELETE FROM ops.task_queue 
WHERE status IN ('done', 'failed', 'cancelled')
  AND completed_at < NOW() - INTERVAL '6 months';
-- Checklist items auto-delete via ON DELETE CASCADE
```

#### Option B: Database trigger
```sql
-- Trigger that archives/deletes old tasks on INSERT (piggyback on activity)
-- Less predictable, harder to debug
```

#### Option C: Scheduled OpenClaw cron job
```yaml
# Add to cron config
- name: task-cleanup
  schedule: { kind: cron, expr: "0 3 1 * *" }  # 3 AM, 1st of month
  payload:
    kind: agentTurn
    message: "Run task_queue cleanup: DELETE tasks older than 6 months"
```

### Recommendation
Use **Option A** with pg_cron for reliability:
```sql
SELECT cron.schedule('task-cleanup-monthly', '0 3 1 * *', $$
  DELETE FROM ops.task_queue 
  WHERE status IN ('done', 'failed', 'cancelled')
    AND completed_at < NOW() - INTERVAL '6 months'
$$);
```

### Safeguards
- Only delete `done`/`failed`/`cancelled` (never `running` or `planned`)
- Log count before delete for audit trail
- Consider archiving to `ops.task_queue_archive` first if history needed
