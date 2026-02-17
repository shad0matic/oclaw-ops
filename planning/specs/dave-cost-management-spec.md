# Dave Cost Management - Full Spec

**Author:** Nefario (Gemini)
**Date:** 17/02/2026
**Status:** Draft

---

## 1. Problem Statement

Currently, AI and operational costs are tracked manually, which is inefficient and prone to error. We lack a centralized system to monitor API usage, attribute costs to specific agents or tasks, manage subscriptions, and receive timely budget alerts. This makes it difficult to optimize spending and make data-driven decisions about resource allocation.

This spec outlines a comprehensive cost management module for the MC Dashboard, codenamed "Dave".

---

## 2. Core Features

- **AI Cost Tracking:** Monitor API costs from providers like OpenAI, Anthropic, Google, etc., broken down by model, agent, and task.
- **Subscription Management:** Track recurring software and service subscriptions.
- **Budgeting & Alerts:** Set monthly or project-based budgets and receive alerts when spending exceeds thresholds.
- **Dashboards:** Visualize cost data through interactive charts and tables.

---

## 3. DB Schema

We'll need several new tables to store cost-related data.

```sql
-- Table to store API cost data per request
CREATE TABLE IF NOT EXISTS ops.ai_api_costs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provider VARCHAR(50) NOT NULL, -- e.g., 'openai', 'anthropic'
    model VARCHAR(100) NOT NULL,
    agent_id VARCHAR(50),
    task_id BIGINT REFERENCES ops.task_queue(id),
    prompt_tokens INT,
    completion_tokens INT,
    cost_usd DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_api_costs_agent_id ON ops.ai_api_costs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_costs_task_id ON ops.ai_api_costs(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_costs_timestamp ON ops.ai_api_costs(timestamp);

-- Table to track subscriptions
CREATE TABLE IF NOT EXISTS ops.subscriptions (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    plan_name VARCHAR(100),
    monthly_cost_usd DECIMAL(10, 2) NOT NULL,
    billing_cycle_start_day INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for budgets and alerts
CREATE TABLE IF NOT EXISTS ops.budgets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly', 'project'
    project_id BIGINT, -- Null for general budgets
    alert_threshold_percent DECIMAL(5, 2) DEFAULT 80.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. API Endpoints

### Cost Data
- `POST /api/costs/ai`: Ingests AI API cost data from agents or logging middleware.
- `GET /api/costs/ai/summary`: Retrieves aggregated AI cost data for dashboards. Supports filtering by date range, agent, and model.
- `GET /api/costs/ai/by_task/:taskId`: Get all AI costs associated with a specific task.

### Subscriptions
- `GET /api/subscriptions`: List all active subscriptions.
- `POST /api/subscriptions`: Create a new subscription entry.
- `PUT /api/subscriptions/:id`: Update a subscription.
- `DELETE /api/subscriptions/:id`: Deactivate a subscription.

### Budgets
- `GET /api/budgets`: List all budgets.
- `POST /api/budgets`: Create a new budget.
- `PUT /api/budgets/:id`: Update a budget.
- `DELETE /api/budgets/:id`: Delete a budget.

---

## 5. UI Components

### Main Dashboard Page (`/costs`)
- **Summary Widgets:**
    - "Total Spend This Month"
    - "AI API Costs MTD"
    - "Subscription Costs MTD"
    - "Projected Monthly Spend"
- **AI Cost Breakdown Chart:** Bar or line chart showing daily/weekly AI costs, filterable by time period.
- **Spend by Agent Chart:** Pie or donut chart showing cost distribution among agents.
- **Spend by Model Chart:** Pie chart breaking down costs by AI model.
- **Active Budgets Overview:** List of active budgets showing current spend vs. budget.
- **Subscriptions Table:** A sortable, searchable table of all tracked subscriptions.

### Cost Details Page (`/costs/ai`)
- A detailed, filterable table of all individual AI API cost entries.
- Filters: Date range, agent, model, provider, task ID.

### Budgets Management Page (`/costs/budgets`)
- Interface to create, view, edit, and delete budgets.
- A form for setting budget name, amount, period, and alert thresholds.

### Task Detail Sheet Integration
- Add a "Cost" tab or section to the existing Kanban task detail sheet.
- This section will display the total AI API cost for that specific task, fetched from `GET /api/costs/ai/by_task/:taskId`.

---

## 6. Implementation Plan

### Phase 1: Backend Foundation & Data Ingestion
- **Task:** Create the `ai_api_costs`, `subscriptions`, and `budgets` tables in the database.
- **Task:** Develop the `POST /api/costs/ai` endpoint for receiving cost data.
- **Task:** Instrument the core agent logic to log token usage and cost data to the new endpoint after each AI model call. This is the most critical step.

### Phase 2: Subscription Management UI
- **Task:** Build the API endpoints for CRUD operations on subscriptions (`GET`, `POST`, `PUT`, `DELETE`).
- **Task:** Create the UI for listing, adding, and editing subscriptions on the main costs dashboard.

### Phase 3: AI Cost Dashboard
- **Task:** Build the API endpoint (`GET /api/costs/ai/summary`) to provide aggregated data.
- **Task:** Develop the main dashboard UI with the summary widgets and cost breakdown charts.
- **Task:** Integrate the cost breakdown into the Kanban task detail sheet.

### Phase 4: Budgets & Alerting
- **Task:** Build the API endpoints for CRUD operations on budgets.
- **Task:** Create the UI for managing budgets.
- **Task:** Implement a background worker (cron job) that runs daily:
    - Checks current spending against active budgets.
    - If a budget's alert threshold is exceeded, sends a notification (e.g., via Telegram or email).

---

## 7. Open Questions

1. **Cost Calculation:** How do we handle price changes for models? Should we store the price per token at the time of the request, or calculate cost based on current prices? (Suggestion: Store the cost at the time of the request for accuracy).
2. **Real-time vs. Batched Updates:** Should cost data be sent to the API in real-time after every call, or batched and sent periodically? (Suggestion: Real-time for immediate visibility).
3. **Data Granularity:** Is the proposed schema for `ai_api_costs` sufficient, or do we need more details like latency, region, etc.?
