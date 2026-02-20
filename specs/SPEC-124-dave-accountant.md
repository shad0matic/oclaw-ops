# SPEC-124: Dave — The Accountant Agent 💰

> Per-agent cost tracking, budget enforcement, and spend reporting

**Status:** In Progress (Phase 2 Complete)  
**Created:** 2026-02-20  
**Updated:** 2026-02-20  
**MC Task:** #124  
**Priority:** P0 (prerequisite for autonomous KB enrichment)

---

## 1. Problem Statement

Currently, we have no visibility into:
- How much each agent costs per run
- Daily/weekly/monthly spend by agent
- Whether autonomous runs are burning budget silently
- When to stop before hitting cost limits

**Without Dave, we cannot safely run autonomous enrichment pipelines** (Nefario research, nightly MiniMax processing, etc.)

---

## 2. Goals

### Must Have (P0)
- [x] Track cost per API call (input tokens, output tokens, model) ✅ Phase 1
- [x] Attribute costs to specific agents (Kevin, Nefario, Phil, Echo, Smaug, etc.) ✅ Phase 2
- [x] Daily spend totals per agent ✅ Phase 1+2
- [ ] Hard budget caps with automatic stops (Phase 3)
- [ ] Alerts before hitting limits (80% threshold) (Phase 3)

### Should Have (P1)
- [x] Weekly/monthly aggregations ✅ Phase 1
- [ ] Cost breakdown by task type (research, transcription, enrichment)
- [ ] Dashboard widget showing spend trends (Phase 4)
- [ ] Configurable alert channels (Telegram topic, DM) (Phase 3)

### Nice to Have (P2)
- [ ] Cost predictions ("at this rate, you'll hit budget in X days")
- [ ] Efficiency metrics (tokens per useful output)
- [ ] Model comparison ("Opus costs 10x more but only 2x better here")
- [ ] Exportable reports (CSV/JSON)

---

## 3. Architecture

### 3.1 Data Model

```sql
-- Core cost tracking table
CREATE TABLE agent_costs (
    id              SERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Agent identification
    agent_id        VARCHAR(64) NOT NULL,      -- 'kevin', 'nefario', 'phil', etc.
    session_key     VARCHAR(128),              -- OpenClaw session reference
    
    -- API call details
    provider        VARCHAR(32) NOT NULL,      -- 'anthropic', 'openai', 'google', etc.
    model           VARCHAR(64) NOT NULL,      -- 'claude-sonnet-4-5', 'gpt-4o', etc.
    
    -- Token counts
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cached_tokens   INTEGER DEFAULT 0,         -- Anthropic prompt caching
    
    -- Calculated cost (in cents to avoid float issues)
    cost_cents      INTEGER NOT NULL,
    
    -- Context
    task_type       VARCHAR(64),               -- 'research', 'transcription', 'chat', etc.
    task_ref        VARCHAR(128),              -- Reference to task/bookmark/etc.
    metadata        JSONB DEFAULT '{}'         -- Flexible additional data
);

-- Indexes for common queries
CREATE INDEX idx_agent_costs_agent_date ON agent_costs(agent_id, created_at);
CREATE INDEX idx_agent_costs_date ON agent_costs(created_at);

-- Budget configuration
CREATE TABLE agent_budgets (
    id              SERIAL PRIMARY KEY,
    agent_id        VARCHAR(64) NOT NULL UNIQUE,
    
    -- Budget limits (in cents)
    daily_limit     INTEGER,                   -- NULL = unlimited
    weekly_limit    INTEGER,
    monthly_limit   INTEGER,
    
    -- Alert thresholds (percentage)
    alert_threshold INTEGER DEFAULT 80,
    
    -- Status
    is_paused       BOOLEAN DEFAULT FALSE,     -- Hard stop triggered
    paused_at       TIMESTAMPTZ,
    paused_reason   TEXT,
    
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregates (materialized for speed)
CREATE TABLE agent_daily_spend (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    agent_id        VARCHAR(64) NOT NULL,
    
    total_cents     INTEGER NOT NULL DEFAULT 0,
    call_count      INTEGER NOT NULL DEFAULT 0,
    
    -- Breakdown by model tier
    tier1_cents     INTEGER DEFAULT 0,         -- MiniMax, cheap models
    tier2_cents     INTEGER DEFAULT 0,         -- Sonnet, mid-tier
    tier3_cents     INTEGER DEFAULT 0,         -- Opus, expensive
    
    UNIQUE(date, agent_id)
);
```

### 3.2 Pricing Configuration

```yaml
# dave/pricing.yaml
providers:
  anthropic:
    claude-opus-4-5:
      input_per_mtok: 15.00      # $ per million tokens
      output_per_mtok: 75.00
      cached_per_mtok: 1.50
      tier: 3
    claude-sonnet-4-5:
      input_per_mtok: 3.00
      output_per_mtok: 15.00
      cached_per_mtok: 0.30
      tier: 2
    claude-haiku-4-5:
      input_per_mtok: 0.80
      output_per_mtok: 4.00
      cached_per_mtok: 0.08
      tier: 1
      
  openai:
    gpt-4o:
      input_per_mtok: 2.50
      output_per_mtok: 10.00
      tier: 2
    gpt-4o-mini:
      input_per_mtok: 0.15
      output_per_mtok: 0.60
      tier: 1
    whisper-1:
      per_minute: 0.006          # Audio transcription
      tier: 1
      
  google:
    gemini-2.5-pro:
      input_per_mtok: 1.25
      output_per_mtok: 10.00
      tier: 2
      
  minimax:
    MiniMax-M2.5:
      input_per_mtok: 0.15
      output_per_mtok: 1.10
      tier: 1
```

### 3.3 Integration Points

#### A. OpenClaw Gateway Hook

Dave needs to intercept API responses to capture token usage. Options:

**Option 1: Gateway Middleware (Preferred)**
- Hook into OpenClaw's provider response handling
- Capture usage data before returning to agent
- Zero agent code changes required

**Option 2: Agent-Side Reporting**
- Each agent reports its own costs
- Requires modifying all agent code
- Less reliable (agents could forget/fail)

**Recommendation:** Option 1 — implement as OpenClaw middleware/plugin

#### B. Budget Enforcement

```
┌──────────────┐     ┌──────────┐     ┌──────────────┐
│  API Request │────▶│   Dave   │────▶│  Provider    │
│  (from agent)│     │  Check   │     │  (Anthropic) │
└──────────────┘     └────┬─────┘     └──────────────┘
                          │
                    Budget OK? ───No──▶ BLOCK + Alert
                          │
                         Yes
                          │
                          ▼
                    Allow request
```

Pre-flight check:
1. Query current daily/weekly/monthly spend for agent
2. Compare against budget limits
3. If over limit → block request, alert, log
4. If approaching limit (>80%) → allow but alert

#### C. Alert System

Alerts go to:
1. **Telegram topic 4706** (task notifications) for automated runs
2. **DM** for critical alerts (budget exceeded, agent paused)
3. **Dashboard** real-time widget

Alert types:
- `warning` — approaching budget (80%)
- `critical` — budget exceeded, agent paused
- `info` — daily summary, notable spikes

---

## 4. API / Interface

### 4.1 Dave Commands (via Kevin/agents)

```
/cost today                    # Today's spend by agent
/cost agent:nefario            # Nefario's costs (default: last 7 days)
/cost agent:nefario days:30    # Nefario last 30 days
/cost week                     # This week's total
/cost month                    # This month's total

/budget set nefario daily:500  # Set Nefario's daily limit to €5
/budget set nefario weekly:2000 # Weekly €20 limit
/budget show                   # Show all agent budgets
/budget pause nefario          # Manually pause an agent
/budget resume nefario         # Resume after pause
```

### 4.2 Dashboard Endpoints

```
GET /api/costs/summary
  ?period=day|week|month
  ?agent_id=nefario (optional)

Response:
{
  "period": "day",
  "date": "2026-02-20",
  "total_cents": 1523,
  "by_agent": [
    { "agent_id": "nefario", "cost_cents": 892, "calls": 12 },
    { "agent_id": "smaug", "cost_cents": 431, "calls": 87 },
    { "agent_id": "kevin", "cost_cents": 200, "calls": 45 }
  ],
  "by_tier": {
    "tier1": 431,
    "tier2": 200,
    "tier3": 892
  }
}

GET /api/costs/history
  ?agent_id=nefario
  ?days=30

Response:
{
  "agent_id": "nefario",
  "history": [
    { "date": "2026-02-20", "cost_cents": 892 },
    { "date": "2026-02-19", "cost_cents": 1204 },
    ...
  ]
}

GET /api/budgets
Response:
{
  "budgets": [
    {
      "agent_id": "nefario",
      "daily_limit": 1000,
      "daily_spent": 892,
      "daily_remaining": 108,
      "is_paused": false
    },
    ...
  ]
}
```

### 4.3 Dashboard Widget

**Cost Overview Card:**
```
┌─────────────────────────────────────┐
│  💰 Today's Spend          €15.23  │
├─────────────────────────────────────┤
│  Nefario    ████████░░  €8.92      │
│  Smaug      ████░░░░░░  €4.31      │
│  Kevin      ██░░░░░░░░  €2.00      │
├─────────────────────────────────────┤
│  Weekly: €89.50 / €200 budget      │
│  ████████████████░░░░░ 45%         │
└─────────────────────────────────────┘
```

---

## 5. Implementation Plan

### Phase 1: Core Tracking (MVP) ✅ COMPLETE
**Completed:** 2026-02-20 by Bob

1. ✅ Created DB tables (agent_costs, agent_budgets, agent_daily_spend)
2. ✅ Built cost calculation module (`/lib/dave/pricing.ts`, `cost-calculator.ts`)
3. ✅ API endpoints (`/api/dave/costs`, `/api/dave/budgets`, `/api/dave/summary`)
4. ✅ Database operations module (`/lib/dave/db.ts`)

### Phase 2: Gateway Integration ✅ COMPLETE
**Completed:** 2026-02-20 by Bob

1. ✅ Identified hook point: Session JSONL files contain usage data per API call
2. ✅ Created `tools/cost-logger.mjs` — watches session files with chokidar
3. ✅ Auto-attributes to agent via session file path (`agents/{agentId}/sessions/`)
4. ✅ Created `tools/cost-backfill.mjs` — backfills historical data
5. ✅ Systemd service file: `tools/oclaw-cost-logger.service`

**Installation:**
```bash
sudo cp tools/oclaw-cost-logger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable oclaw-cost-logger
sudo systemctl start oclaw-cost-logger
```

### Phase 3: Budget Enforcement
**Estimate:** 4-6 hours

1. Pre-flight budget check
2. Block mechanism + alerting
3. Auto-pause when limit exceeded
4. `/budget` commands

### Phase 4: Dashboard & Reports
**Estimate:** 4-6 hours

1. Cost summary API endpoints
2. Dashboard widget component
3. Historical charts
4. Daily summary cron (optional Telegram report)

**Total estimate:** 18-26 hours

---

## 6. Open Questions (Resolved)

1. **Where does Dave live?**
   - ✅ **Answer:** Part of oclaw-ops dashboard backend (`/lib/dave/`) + standalone Node.js services (`tools/cost-logger.mjs`)

2. **How to intercept OpenClaw API calls?**
   - ✅ **Answer:** Session JSONL files contain full usage data per assistant message. We watch these files with chokidar and log to DB on change. No upstream patches needed!

3. **Initial budget limits?**
   - ✅ **Answer:** Configured in Phase 1 via `/api/dave/budgets`:
     - kevin: $10/day
     - nefario: $5/day
     - smaug: $2/day
   - Enforcement coming in Phase 3

4. **Historical data?**
   - ✅ **Answer:** `tools/cost-backfill.mjs` can backfill from session logs. Initial backfill done for last 2 days: 1,916 API calls totaling $715.66

---

## 7. Success Criteria

Dave is complete when:
- [x] Every API call's cost is logged with agent attribution ✅ Phase 2
- [x] Can query "how much did Nefario spend yesterday?" ✅ Phase 1 APIs
- [ ] Budget limits stop agents before overspend (Phase 3)
- [ ] Alerts fire at 80% threshold (Phase 3)
- [ ] Dashboard shows real-time spend (Phase 4)
- [ ] Boss feels confident running autonomous pipelines overnight

**Current Data (as of Phase 2 backfill):**
- main: $707.53 (1,809 calls)
- bob: $8.13 (107 calls)
- nefario: $1.13 (1 call)
- Total tracked: $715.66+ across 1,916+ API calls

---

## 8. Dependencies

- **oclaw-ops dashboard** — for UI components
- **OpenClaw gateway** — for API interception (may need investigation)
- **Postgres** — already in use for dashboard

---

## 9. References

- KB Project doc: `docs/projects/kb-project.md`
- Model tiering discussion: Topic 594
- OpenClaw architecture: `/home/openclaw/.openclaw/workspace/docs/`
