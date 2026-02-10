# API Reference

All API routes require authentication via NextAuth session.

## Agents

### GET /api/agents
List all agents with status.

**Response:**
```json
[
  {
    "id": 1,
    "agent_id": "main",
    "name": "Kevin",
    "level": 3,
    "trust_score": "0.85",
    "total_tasks": 150,
    "successful_tasks": 140,
    "status": "idle",
    "last_active": "2026-02-10T12:00:00Z"
  }
]
```

### GET /api/agents/[id]
Get single agent details with reviews.

**Response:**
```json
{
  "id": 1,
  "agent_id": "main",
  "name": "Kevin",
  "level": 3,
  "trust_score": "0.85",
  "total_tasks": 150,
  "successful_tasks": 140,
  "status": "idle",
  "last_active": "2026-02-10T12:00:00Z",
  "total_events": 5000,
  "reviews": [...]
}
```

### POST /api/agents/[id]/review
Submit a performance review.

**Request:**
```json
{
  "rating": 4,
  "feedback": "Good work on the API refactor",
  "output_summary": "Refactored authentication system"
}
```

### POST /api/agents/[id]/promote
Promote agent to next level.

**Request:**
```json
{
  "feedback": "Consistently high quality work"
}
```

### POST /api/agents/[id]/demote
Demote agent to previous level.

**Request:**
```json
{
  "feedback": "Repeated critical errors"
}
```

## Workflows

### GET /api/workflows
List all workflows.

**Response:**
```json
[
  {
    "id": 1,
    "name": "daily-summary",
    "description": "Generate daily summary report",
    "version": 2,
    "enabled": true,
    "total_runs": 150,
    "last_run_status": "completed",
    "last_run_at": "2026-02-10T00:00:00Z"
  }
]
```

### POST /api/workflows/[id]/run
Trigger a workflow run.

**Request:**
```json
{
  "task": "Generate summary for February 9th",
  "context": {
    "date": "2026-02-09",
    "include_metrics": true
  }
}
```

**Response:**
```json
{
  "id": "12345",
  "workflow_id": 1,
  "status": "pending",
  "created_at": "2026-02-10T12:00:00Z"
}
```

## Runs

### GET /api/runs
List runs with optional filters.

**Query Params:**
- `status`: pending|running|completed|failed
- `workflow_id`: Workflow ID
- `agent_id`: Agent ID
- `limit`: Max results (default: 20)

**Response:**
```json
[
  {
    "id": "12345",
    "workflow_id": 1,
    "workflow_name": "daily-summary",
    "status": "completed",
    "task": "Generate summary",
    "triggered_by": "manual",
    "created_at": "2026-02-10T00:00:00Z",
    "completed_at": "2026-02-10T00:05:00Z"
  }
]
```

### GET /api/runs/[id]
Get run details with steps.

**Response:**
```json
{
  "id": "12345",
  "workflow_id": 1,
  "status": "completed",
  "steps": [
    {
      "id": "1",
      "step_name": "fetch_data",
      "step_order": 1,
      "agent_id": "main",
      "status": "completed",
      "input": {},
      "output": {},
      "retries": 0
    }
  ]
}
```

## Memory

### POST /api/memory/search
Search memories or daily notes (text-based).

**Request:**
```json
{
  "query": "authentication",
  "type": "memories",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "123",
      "content": "Implemented JWT authentication...",
      "tags": ["auth", "security"],
      "agent_id": "main",
      "importance": 8,
      "created_at": "2026-02-01T10:00:00Z"
    }
  ],
  "query": "authentication",
  "count": 5
}
```

### GET /api/memory/stats
Get memory statistics.

**Response:**
```json
{
  "total_memories": 1500,
  "total_daily_notes": 45,
  "average_importance": 6.5,
  "by_agent": [
    { "agent_id": "main", "count": 1200 }
  ],
  "top_tags": [
    { "tag": "auth", "count": 150 }
  ],
  "recent_memories": [...]
}
```

## Events

### GET /api/events
List events with filters.

**Query Params:**
- `agent_id`: Filter by agent
- `event_type`: Filter by type
- `date_from`: ISO date string
- `limit`: Max results (default: 100)

## System

### GET /api/system/health
Get system health metrics.

**Response:**
```json
{
  "cpu": { "usage": 45.2 },
  "memory": {
    "total": 16000000000,
    "used": 8000000000,
    "free": 8000000000
  },
  "disk": {
    "total": 500000000000,
    "used": 250000000000,
    "free": 250000000000
  },
  "db": {
    "size": 524288000,
    "connections": 12
  },
  "openclaw": {
    "version": "1.0.0",
    "status": "running"
  },
  "backup": {
    "next_in_hours": 8
  },
  "uptime": 86400
}
```

## Priorities

### GET /api/priorities
List priorities.

**Query Params:**
- `include_resolved`: true|false

### POST /api/priorities
Create a priority.

**Request:**
```json
{
  "entity": "API rate limiting",
  "entity_type": "topic",
  "priority": 2,
  "context": "Users hitting rate limits",
  "reported_by": "main"
}
```

### PATCH /api/priorities/[id]
Update priority.

**Request:**
```json
{
  "priority": 1,
  "resolved": false
}
```

## Mistakes

### GET /api/mistakes
List mistakes.

**Query Params:**
- `agent_id`: Filter by agent
- `include_resolved`: true|false

### POST /api/mistakes
Log a mistake.

**Request:**
```json
{
  "agent_id": "main",
  "description": "Failed to validate input",
  "context": "User registration endpoint",
  "lesson_learned": "Always validate email format",
  "severity": 3
}
```

### PATCH /api/mistakes/[id]
Update mistake.

**Request:**
```json
{
  "resolved": true,
  "lesson_learned": "Implemented regex validation"
}
```

## Reactions

### GET /api/reactions
List all reaction rules.

### POST /api/reactions
Create reaction rule.

**Request:**
```json
{
  "trigger_agent": "main",
  "trigger_event": "error",
  "trigger_filter": { "severity": "high" },
  "responder_agent": "monitor",
  "action": "send_alert",
  "action_params": { "channel": "ops" },
  "probability": 1.0,
  "enabled": true
}
```

### PATCH /api/reactions/[id]
Update reaction.

### DELETE /api/reactions/[id]
Delete reaction.

## Costs

### GET /api/costs/subscriptions
List active subscriptions.

### POST /api/costs/subscriptions
Add subscription.

**Request:**
```json
{
  "name": "OpenAI API",
  "provider": "OpenAI",
  "monthly_price": 50.00,
  "currency": "EUR",
  "active": true
}
```

### GET /api/costs/snapshots
Get cost snapshots.

**Query Params:**
- `days`: Number of days (default: 30)

## Knowledge

### GET /api/knowledge/entities
List entities.

**Query Params:**
- `entity_type`: Filter by type

### POST /api/knowledge/entities
Create entity.

**Request:**
```json
{
  "name": "PostgreSQL",
  "entity_type": "technology",
  "aliases": ["Postgres", "PG"],
  "properties": { "category": "database" },
  "first_seen_by": "main"
}
```

## Compounds

### GET /api/compounds
List memory compounds.

**Response:**
```json
[
  {
    "id": "123",
    "period_start": "2026-02-01",
    "period_end": "2026-02-07",
    "summary": "Week focused on authentication improvements",
    "key_learnings": ["JWT best practices", "Rate limiting"],
    "mistakes": ["Missed edge case in validation"],
    "agent_id": "main",
    "created_at": "2026-02-08T00:00:00Z"
  }
]
```
