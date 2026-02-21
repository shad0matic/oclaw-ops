# Dave Phase 3: Budget Enforcement

Pre-flight budget checks, auto-pause, alerting, and CLI commands for budget management.

## Features

1. **Pre-flight budget checks** — Check if agent is within budget before API calls
2. **Automatic blocking** — Prevent API calls when budget is exceeded (100%)
3. **Warning alerts** — Warn at configurable threshold (default 80%)
4. **Auto-pause** — Automatically pause agents when budget limit hit
5. **CLI tools** — Manage budgets via command line
6. **API endpoints** — Programmatic budget management

## CLI Tools

### `budget.mjs` — Budget Management

Manage agent budgets from the command line.

```bash
# Show budget status for an agent
budget show kevin

# Set budget limits (amounts in cents)
budget set kevin --daily 500 --weekly 2000 --monthly 8000

# Set custom alert threshold (default 80%)
budget set stuart --daily 1000 --alert 75

# Pause an agent (prevents all API calls)
budget pause kevin "Over budget for the day"

# Resume a paused agent
budget resume kevin

# List all budgets
budget list
```

**Examples:**

```bash
# Set daily budget of $5, weekly $20, monthly $80 for kevin
budget set kevin --daily 500 --weekly 2000 --monthly 8000

# Show current budget status
budget show kevin

# Output:
# 📊 Budget Status: kevin
#
# Status: ✅ Active
# Alert threshold: 80%
#
# Daily:   🟢  $2.34 / $5.00  (46.8%)
# Weekly:  🟢  $8.12 / $20.00  (40.6%)
# Monthly: 🟡  $67.45 / $80.00  (84.3%)
```

### `budget-check.mjs` — Pre-flight Budget Check

Check if an agent can make an API call without exceeding budget.

```bash
# Basic check
budget-check.mjs kevin

# Check with estimated cost of next call
budget-check.mjs kevin --cost-cents 50

# JSON output (for scripts)
budget-check.mjs kevin --cost-cents 50 --json

# Quiet mode (only errors)
budget-check.mjs kevin --quiet
```

**Exit Codes:**

- `0` = OK (under budget)
- `1` = WARNING (>= alert threshold, e.g., 80%)
- `2` = BLOCKED (over budget or agent paused)
- `3` = ERROR (database error)

**Example output:**

```bash
$ budget-check.mjs kevin --cost-cents 100
✅ OK: kevin within budget

$ budget-check.mjs stuart --cost-cents 500
⚠️  WARNING: stuart approaching budget limit
   daily: 85.2% ($4.26 / $5.00)

$ budget-check.mjs nefario --cost-cents 100
❌ BLOCKED: nefario over budget
   daily: 102.4% ($5.12 / $5.00)
```

## API Endpoints

### `GET /api/dave/check`

Pre-flight budget check (same as CLI tool).

**Query parameters:**
- `agent` (required) — Agent ID
- `cost` (optional) — Estimated cost in cents

**Response:**

```json
{
  "allowed": true,
  "status": "ok",
  "currentSpend": {
    "daily": 234,
    "weekly": 812,
    "monthly": 6745
  },
  "projectedSpend": {
    "daily": 284,
    "weekly": 862,
    "monthly": 6795
  }
}
```

**Status values:**
- `ok` — Under budget
- `warning` — Approaching threshold (still allowed)
- `over_budget` — Budget exceeded (blocked, agent auto-paused)
- `paused` — Agent manually paused (blocked)
- `no_budget` — No budget configured (allowed)
- `error` — Error checking budget (allowed by default for safety)

**HTTP status codes:**
- `200` — OK or warning
- `403` — Blocked (over budget or paused)
- `500` — Server error

**Example:**

```bash
# Check if kevin can make a $0.50 call
curl "http://localhost:3000/api/dave/check?agent=kevin&cost=50"
```

### `GET /api/dave/budgets`

Get budget configuration and status.

```bash
# Get all budgets
curl "http://localhost:3000/api/dave/budgets"

# Get specific agent
curl "http://localhost:3000/api/dave/budgets?agent=kevin"
```

**Response:**

```json
{
  "budget": {
    "agentId": "kevin",
    "dailyLimit": 500,
    "weeklyLimit": 2000,
    "monthlyLimit": 8000,
    "alertThreshold": 80,
    "isPaused": false,
    "pausedAt": null,
    "pausedReason": null
  },
  "status": {
    "agentId": "kevin",
    "currentSpend": {
      "daily": 234,
      "weekly": 812,
      "monthly": 6745
    },
    "percentUsed": {
      "daily": 46.8,
      "weekly": 40.6,
      "monthly": 84.3
    },
    "alerts": ["monthly"],
    "overBudget": []
  }
}
```

### `POST /api/dave/budgets`

Set budget limits or pause/resume an agent.

**Set budget:**

```bash
curl -X POST "http://localhost:3000/api/dave/budgets" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "kevin",
    "dailyLimit": 500,
    "weeklyLimit": 2000,
    "monthlyLimit": 8000,
    "alertThreshold": 80
  }'
```

**Pause agent:**

```bash
curl -X POST "http://localhost:3000/api/dave/budgets" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "kevin",
    "action": "pause",
    "reason": "Over budget"
  }'
```

**Resume agent:**

```bash
curl -X POST "http://localhost:3000/api/dave/budgets" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "kevin",
    "action": "resume"
  }'
```

## Integration Guide

### Shell Scripts

```bash
#!/bin/bash
# Example: Pre-flight check before running an agent task

AGENT_ID="kevin"

# Check budget before starting
if ! budget-check.mjs "$AGENT_ID" --quiet; then
  echo "❌ Cannot run: budget exceeded or agent paused"
  exit 1
fi

# Run your task
./run-agent-task.sh

# Budget exceeded during task? Auto-paused by Dave
```

### Node.js Integration

```javascript
import { checkBudgetStatus } from '@/lib/dave'

async function beforeApiCall(agentId, estimatedCost = 0) {
  const status = await checkBudgetStatus(agentId)
  
  if (status.budget.isPaused) {
    throw new Error(`Agent ${agentId} is paused: ${status.budget.pausedReason}`)
  }
  
  // Check if adding this cost would exceed budget
  for (const block of status.overBudget) {
    throw new Error(`${agentId} over ${block} budget`)
  }
  
  // Warn if approaching limit
  for (const alert of status.alerts) {
    console.warn(`⚠️  ${agentId} at ${status.percentUsed[alert]}% of ${alert} budget`)
  }
}

// Before making API call
await beforeApiCall('kevin', 50)
```

### OpenClaw Gateway Integration (Future)

The pre-flight check can be integrated into the OpenClaw gateway to automatically enforce budgets before API calls:

```javascript
// In gateway request interceptor
async function beforeApiRequest(context) {
  const agentId = context.session.agentId
  const estimatedCost = estimateCostFromModel(context.model)
  
  const check = await fetch(`http://localhost:3000/api/dave/check?agent=${agentId}&cost=${estimatedCost}`)
  const result = await check.json()
  
  if (!result.allowed) {
    throw new Error(`Budget enforcement: ${result.status}`)
  }
  
  if (result.status === 'warning') {
    console.warn(`⚠️  Budget warning: ${JSON.stringify(result.alerts)}`)
  }
}
```

## How It Works

### Auto-Pause Mechanism

When a budget check detects that projected spend would exceed 100% of any configured limit (daily/weekly/monthly):

1. Budget check fails with `status: 'over_budget'`
2. Agent is automatically paused in database
3. Paused reason is set to indicate which budget was exceeded
4. All subsequent API calls are blocked until manually resumed

**Database update:**

```sql
UPDATE ops.agent_budgets
SET is_paused = TRUE, 
    paused_at = NOW(), 
    paused_reason = 'Budget exceeded: daily, monthly',
    updated_at = NOW()
WHERE agent_id = 'kevin' AND is_paused = FALSE
```

### Warning Alerts

When spend reaches the alert threshold (default 80%), budget check returns warnings but still allows the call:

- `status: 'warning'`
- `allowed: true`
- `alerts` array contains affected periods
- Exit code 1 (for CLI tool)

This gives you visibility before hitting hard limits.

### Budget Periods

- **Daily** — Resets at midnight (CURRENT_DATE)
- **Weekly** — Resets at start of week (Monday, PostgreSQL `date_trunc('week', ...)`)
- **Monthly** — Resets at start of month (1st, PostgreSQL `date_trunc('month', ...)`)

All limits are independent — exceeding any one will trigger a block.

## Testing

Run the test suite:

```bash
cd ~/projects/oclaw-ops
./tools/test-budget-enforcement.sh
```

This will:
1. Create a test agent
2. Set budget limits
3. Test pre-flight checks with various cost amounts
4. Verify warning threshold (80%)
5. Verify hard block at 100%
6. Test auto-pause mechanism
7. Test manual pause/resume

## Database Schema

Budget configuration is stored in `ops.agent_budgets`:

```sql
CREATE TABLE ops.agent_budgets (
  id              SERIAL PRIMARY KEY,
  agent_id        VARCHAR(64) NOT NULL UNIQUE,
  
  -- Budget limits (in cents)
  daily_limit     INTEGER,
  weekly_limit    INTEGER,
  monthly_limit   INTEGER,
  
  -- Alert thresholds (percentage)
  alert_threshold INTEGER DEFAULT 80,
  
  -- Status
  is_paused       BOOLEAN DEFAULT FALSE,
  paused_at       TIMESTAMPTZ,
  paused_reason   TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Current spend is tracked in `ops.agent_daily_spend` (aggregated by `cost-logger.mjs`).

## Examples

### Set Conservative Budget

```bash
# Very tight daily budget: $1/day, $5/week, $15/month
budget set kevin --daily 100 --weekly 500 --monthly 1500

# Aggressive alert at 50% instead of default 80%
budget set kevin --daily 100 --alert 50
```

### Monitor Budget Status

```bash
# Check all agents
budget list

# Detailed status for one agent
budget show kevin

# Programmatic check (JSON)
budget-check.mjs kevin --json | jq '.status'
```

### Emergency Pause

```bash
# Immediately stop an agent from making API calls
budget pause kevin "Emergency cost control"

# Later, resume
budget resume kevin
```

## Troubleshooting

**Q: Budget check always returns "no_budget" / allows everything**

A: No budget is configured for that agent. Set one with `budget set <agent-id> ...`

**Q: Agent is paused but I want to allow calls**

A: Resume with `budget resume <agent-id>`. The budget limits remain in place.

**Q: I want to disable budget enforcement for an agent**

A: Delete the budget entry:
```sql
DELETE FROM ops.agent_budgets WHERE agent_id = 'kevin';
```

**Q: Pre-flight check shows warning but I want to run anyway**

A: The warning (exit code 1) is informational only — the call is still allowed. If you want to block at warning level, check exit code in your script:

```bash
if ! budget-check.mjs kevin; then
  # Exit 1 (warning) or 2 (blocked)
  echo "Budget warning or block"
  exit 1
fi
```

## Next Steps (Phase 4)

- Dashboard widgets for budget visualization
- Historical budget usage charts
- Daily budget summary reports (Telegram notifications)
- Cost forecasting based on usage trends
- Automatic budget adjustment recommendations

---

**Phase 3 Status:** ✅ Complete

**Related Tasks:**
- #125 — Dave Phase 1: Core cost tracking
- #126 — Dave Phase 2: Gateway integration
- #127 — Dave Phase 3: Budget enforcement (this phase)
- #128 — Dave Phase 4: Dashboard & reports
