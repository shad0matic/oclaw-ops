# SPEC-129: Task Details Dependency Tree View

## Summary
Add a collapsible dependency tree section to the task detail sheet showing upstream (parent) and downstream (child) task relationships.

## Current State
- Tasks have `parent_id` field linking to parent task
- No UI to visualize these relationships
- Users must manually track dependencies

## Requirements

### Data Model
- Use existing `parent_id` column in `ops.task_queue`
- Query upstream: follow `parent_id` chain to root
- Query downstream: find all tasks where `parent_id = current_task.id`

### API Endpoint
**GET** `/api/tasks/[id]/dependencies`

Response:
```json
{
  "upstream": [
    { "id": 45, "title": "Parent task", "status": "done" },
    { "id": 12, "title": "Grandparent", "status": "done" }
  ],
  "downstream": [
    { "id": 130, "title": "Child task 1", "status": "running" },
    { "id": 131, "title": "Child task 2", "status": "queued" }
  ]
}
```

### UI Component
Location: Task detail sheet, below description, above chat

```
┌─ Dependencies ──────────────────────────┐
│ ▼ Depends on (2)                        │
│   ✓ #45 Parent task                     │
│   ✓ #12 Grandparent                     │
│                                         │
│ ▼ Blocks (2)                            │
│   ⏳ #130 Child task 1                  │
│   ○ #131 Child task 2                   │
└─────────────────────────────────────────┘
```

Features:
- Collapsible sections (default expanded if items exist)
- Status icons: ✓ done, ⏳ running, ○ queued/planned, ✗ failed
- Clickable task IDs → open that task's detail sheet
- Show task title truncated to ~40 chars
- Hide section entirely if no dependencies

### Status Indicators
| Status | Icon | Color |
|--------|------|-------|
| done | ✓ | green |
| running | ⏳ | amber |
| review | 👁 | blue |
| queued/planned/assigned | ○ | gray |
| failed/cancelled | ✗ | red |

## Implementation Steps

1. Create API route `/api/tasks/[id]/dependencies/route.ts`
   - Recursive CTE for upstream chain
   - Simple query for downstream

2. Create `<DependencyTree>` component
   - Fetch dependencies on mount
   - Collapsible sections
   - Click handler to switch task

3. Integrate into `task-detail-sheet.tsx`
   - Add below description section
   - Pass current task ID

## Queries

### Upstream (ancestors)
```sql
WITH RECURSIVE ancestors AS (
  SELECT id, title, status, parent_id, 1 as depth
  FROM ops.task_queue WHERE id = $1
  UNION ALL
  SELECT t.id, t.title, t.status, t.parent_id, a.depth + 1
  FROM ops.task_queue t
  JOIN ancestors a ON t.id = a.parent_id
)
SELECT id, title, status FROM ancestors 
WHERE id != $1 
ORDER BY depth;
```

### Downstream (children)
```sql
SELECT id, title, status 
FROM ops.task_queue 
WHERE parent_id = $1
ORDER BY priority, created_at;
```

## Out of Scope
- Drag-drop to reassign parent
- Multi-parent dependencies (DAG)
- Circular dependency detection (trust parent_id integrity)

## Estimate
~2-3 hours implementation
