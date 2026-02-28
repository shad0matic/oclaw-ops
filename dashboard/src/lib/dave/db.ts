/**
 * Dave — The Accountant Agent: Database Operations
 *
 * Handles table creation, cost logging, and querying.
 * Tables are created in the 'ops' schema.
 */

import { pool } from '@/lib/drizzle'

// ============================================================================
// Table Creation (idempotent — safe to call multiple times)
// ============================================================================

export async function ensureDaveTables(): Promise<void> {
  await pool.query(`
    -- Core cost tracking table
    CREATE TABLE IF NOT EXISTS ops.agent_costs (
      id              SERIAL PRIMARY KEY,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      
      -- Agent identification
      agent_id        VARCHAR(64) NOT NULL,
      session_key     VARCHAR(128),
      
      -- API call details
      provider        VARCHAR(32) NOT NULL,
      model           VARCHAR(64) NOT NULL,
      
      -- Token counts
      input_tokens    INTEGER NOT NULL DEFAULT 0,
      output_tokens   INTEGER NOT NULL DEFAULT 0,
      cached_tokens   INTEGER DEFAULT 0,
      
      -- Calculated cost (in cents to avoid float issues)
      cost_cents      INTEGER NOT NULL,
      
      -- Tier for aggregation
      tier            SMALLINT DEFAULT 1,
      
      -- Context
      task_type       VARCHAR(64),
      task_ref        VARCHAR(128),
      metadata        JSONB DEFAULT '{}'
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_agent_costs_agent_date 
      ON ops.agent_costs(agent_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_costs_date 
      ON ops.agent_costs(created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_costs_provider 
      ON ops.agent_costs(provider);

    -- Budget configuration per agent
    CREATE TABLE IF NOT EXISTS ops.agent_budgets (
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

    -- Daily aggregates for fast queries
    CREATE TABLE IF NOT EXISTS ops.agent_daily_spend (
      id              SERIAL PRIMARY KEY,
      date            DATE NOT NULL,
      agent_id        VARCHAR(64) NOT NULL,
      
      total_cents     INTEGER NOT NULL DEFAULT 0,
      call_count      INTEGER NOT NULL DEFAULT 0,
      
      -- Breakdown by model tier
      tier1_cents     INTEGER DEFAULT 0,
      tier2_cents     INTEGER DEFAULT 0,
      tier3_cents     INTEGER DEFAULT 0,
      
      -- Breakdown by token type
      input_tokens    INTEGER DEFAULT 0,
      output_tokens   INTEGER DEFAULT 0,
      cached_tokens   INTEGER DEFAULT 0,
      
      UNIQUE(date, agent_id)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_daily_spend_date 
      ON ops.agent_daily_spend(date DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_daily_spend_agent 
      ON ops.agent_daily_spend(agent_id, date DESC);
  `)
}

// ============================================================================
// Cost Logging
// ============================================================================

export interface LogCostParams {
  agentId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  costCents: number
  tier?: 1 | 2 | 3
  sessionKey?: string
  taskType?: string
  taskRef?: string
  metadata?: Record<string, unknown>
}

/**
 * Log a cost entry and update daily aggregates
 */
export async function logCost(params: LogCostParams): Promise<{ id: number }> {
  const {
    agentId,
    provider,
    model,
    inputTokens,
    outputTokens,
    cachedTokens = 0,
    costCents,
    tier = 1,
    sessionKey,
    taskType,
    taskRef,
    metadata = {},
  } = params

  // Insert the cost record
  const { rows: [inserted] } = await pool.query(`
    INSERT INTO ops.agent_costs (
      agent_id, provider, model, input_tokens, output_tokens, cached_tokens,
      cost_cents, tier, session_key, task_type, task_ref, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    agentId, provider, model, inputTokens, outputTokens, cachedTokens,
    costCents, tier, sessionKey, taskType, taskRef, JSON.stringify(metadata)
  ])

  // Update daily aggregate (upsert)
  const tierColumn = `tier${tier}_cents`
  await pool.query(`
    INSERT INTO ops.agent_daily_spend (date, agent_id, total_cents, call_count, ${tierColumn}, input_tokens, output_tokens, cached_tokens)
    VALUES (CURRENT_DATE, $1, $2, 1, $2, $3, $4, $5)
    ON CONFLICT (date, agent_id) DO UPDATE SET
      total_cents = ops.agent_daily_spend.total_cents + EXCLUDED.total_cents,
      call_count = ops.agent_daily_spend.call_count + 1,
      ${tierColumn} = ops.agent_daily_spend.${tierColumn} + EXCLUDED.${tierColumn},
      input_tokens = ops.agent_daily_spend.input_tokens + EXCLUDED.input_tokens,
      output_tokens = ops.agent_daily_spend.output_tokens + EXCLUDED.output_tokens,
      cached_tokens = ops.agent_daily_spend.cached_tokens + EXCLUDED.cached_tokens
  `, [agentId, costCents, inputTokens, outputTokens, cachedTokens])

  return { id: inserted.id }
}

// ============================================================================
// Queries
// ============================================================================

export interface TodaySpendResult {
  totalCents: number
  byAgent: Array<{
    agentId: string
    costCents: number
    callCount: number
    tier1Cents: number
    tier2Cents: number
    tier3Cents: number
  }>
}

/**
 * Get today's spend by all agents
 */
export async function getTodaySpend(): Promise<TodaySpendResult> {
  const { rows } = await pool.query(`
    SELECT 
      agent_id,
      total_cents as cost_cents,
      call_count,
      tier1_cents,
      tier2_cents,
      tier3_cents
    FROM ops.agent_daily_spend
    WHERE date = CURRENT_DATE
    ORDER BY total_cents DESC
  `)

  const totalCents = rows.reduce((sum: number, r: any) => sum + Number(r.cost_cents), 0)

  return {
    totalCents,
    byAgent: rows.map((r: any) => ({
      agentId: r.agent_id,
      costCents: Number(r.cost_cents),
      callCount: Number(r.call_count),
      tier1Cents: Number(r.tier1_cents),
      tier2Cents: Number(r.tier2_cents),
      tier3Cents: Number(r.tier3_cents),
    })),
  }
}

export interface AgentSpendResult {
  agentId: string
  totalCents: number
  callCount: number
  history: Array<{
    date: string
    costCents: number
    callCount: number
  }>
}

/**
 * Get spend for a specific agent over a period
 */
export async function getAgentSpend(agentId: string, days: number = 7): Promise<AgentSpendResult> {
  const { rows } = await pool.query(`
    SELECT 
      date,
      total_cents as cost_cents,
      call_count
    FROM ops.agent_daily_spend
    WHERE agent_id = $1
      AND date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY date DESC
  `, [agentId])

  const totalCents = rows.reduce((sum: number, r: any) => sum + Number(r.cost_cents), 0)
  const callCount = rows.reduce((sum: number, r: any) => sum + Number(r.call_count), 0)

  return {
    agentId,
    totalCents,
    callCount,
    history: rows.map((r: any) => ({
      date: r.date,
      costCents: Number(r.cost_cents),
      callCount: Number(r.call_count),
    })),
  }
}

export interface PeriodSpendResult {
  period: 'day' | 'week' | 'month'
  totalCents: number
  byAgent: Array<{
    agentId: string
    costCents: number
    callCount: number
  }>
  byTier: {
    tier1: number
    tier2: number
    tier3: number
  }
}

export interface ProviderSpendResult {
  period: 'day' | 'week' | 'month'
  byProvider: Array<{
    provider: string
    inputTokens: number
    outputTokens: number
    cachedTokens: number
  }>
  totalInputTokens: number
  totalOutputTokens: number
  totalCachedTokens: number
}

/**
 * Get tokens grouped by provider for a period
 */
export interface ProviderTokens {
  provider: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
}

export async function getProviderTokens(period: 'day' | 'week' | 'month' = 'month'): Promise<ProviderTokens[]> {
  // Need to aggregate from agent_costs since daily_spend doesn't have provider breakdown
  const { rows } = await pool.query(`
    SELECT 
      CASE 
        WHEN model LIKE 'claude%' THEN 'anthropic'
        WHEN model LIKE 'gemini%' THEN 'google'
        WHEN model LIKE 'MiniMax%' THEN 'minimax'
        ELSE 'other'
      END as provider,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cached_tokens) as cached_tokens
    FROM ops.agent_costs
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1
    ORDER BY provider
  `)

  return rows.map((r: any) => ({
    provider: r.provider,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    cachedTokens: Number(r.cached_tokens),
  }))
}

/**
 * Get spend for a period (day, week, month)
 */
export async function getPeriodSpend(period: 'day' | 'week' | 'month'): Promise<PeriodSpendResult> {
  let dateFilter: string
  switch (period) {
    case 'day':
      dateFilter = "date = CURRENT_DATE"
      break
    case 'week':
      dateFilter = "date >= date_trunc('week', CURRENT_DATE)"
      break
    case 'month':
      dateFilter = "date >= date_trunc('month', CURRENT_DATE)"
      break
  }

  const { rows } = await pool.query(`
    SELECT 
      agent_id,
      SUM(total_cents) as cost_cents,
      SUM(call_count) as call_count,
      SUM(tier1_cents) as tier1,
      SUM(tier2_cents) as tier2,
      SUM(tier3_cents) as tier3
    FROM ops.agent_daily_spend
    WHERE ${dateFilter}
    GROUP BY agent_id
    ORDER BY SUM(total_cents) DESC
  `)

  const totalCents = rows.reduce((sum: number, r: any) => sum + Number(r.cost_cents), 0)
  const tier1 = rows.reduce((sum: number, r: any) => sum + Number(r.tier1), 0)
  const tier2 = rows.reduce((sum: number, r: any) => sum + Number(r.tier2), 0)
  const tier3 = rows.reduce((sum: number, r: any) => sum + Number(r.tier3), 0)

  return {
    period,
    totalCents,
    byAgent: rows.map((r: any) => ({
      agentId: r.agent_id,
      costCents: Number(r.cost_cents),
      callCount: Number(r.call_count),
    })),
    byTier: { tier1, tier2, tier3 },
  }
}

// ============================================================================
// Budget Management
// ============================================================================

export interface AgentBudget {
  agentId: string
  dailyLimit: number | null
  weeklyLimit: number | null
  monthlyLimit: number | null
  alertThreshold: number
  isPaused: boolean
  pausedAt: string | null
  pausedReason: string | null
}

/**
 * Get all agent budgets
 */
export async function getAllBudgets(): Promise<AgentBudget[]> {
  const { rows } = await pool.query(`
    SELECT 
      agent_id,
      daily_limit,
      weekly_limit,
      monthly_limit,
      alert_threshold,
      is_paused,
      paused_at,
      paused_reason
    FROM ops.agent_budgets
    ORDER BY agent_id
  `)

  return rows.map((r: any) => ({
    agentId: r.agent_id,
    dailyLimit: r.daily_limit ? Number(r.daily_limit) : null,
    weeklyLimit: r.weekly_limit ? Number(r.weekly_limit) : null,
    monthlyLimit: r.monthly_limit ? Number(r.monthly_limit) : null,
    alertThreshold: Number(r.alert_threshold),
    isPaused: r.is_paused,
    pausedAt: r.paused_at,
    pausedReason: r.paused_reason,
  }))
}

/**
 * Get or create budget for an agent
 */
export async function getAgentBudget(agentId: string): Promise<AgentBudget> {
  const { rows } = await pool.query(`
    INSERT INTO ops.agent_budgets (agent_id)
    VALUES ($1)
    ON CONFLICT (agent_id) DO UPDATE SET updated_at = NOW()
    RETURNING *
  `, [agentId])

  const r = rows[0]
  return {
    agentId: r.agent_id,
    dailyLimit: r.daily_limit ? Number(r.daily_limit) : null,
    weeklyLimit: r.weekly_limit ? Number(r.weekly_limit) : null,
    monthlyLimit: r.monthly_limit ? Number(r.monthly_limit) : null,
    alertThreshold: Number(r.alert_threshold),
    isPaused: r.is_paused,
    pausedAt: r.paused_at,
    pausedReason: r.paused_reason,
  }
}

/**
 * Set budget limits for an agent
 */
export async function setAgentBudget(
  agentId: string,
  limits: {
    dailyLimit?: number | null
    weeklyLimit?: number | null
    monthlyLimit?: number | null
    alertThreshold?: number
  }
): Promise<AgentBudget> {
  const updates: string[] = []
  const values: any[] = [agentId]
  let idx = 2

  if (limits.dailyLimit !== undefined) {
    updates.push(`daily_limit = $${idx++}`)
    values.push(limits.dailyLimit)
  }
  if (limits.weeklyLimit !== undefined) {
    updates.push(`weekly_limit = $${idx++}`)
    values.push(limits.weeklyLimit)
  }
  if (limits.monthlyLimit !== undefined) {
    updates.push(`monthly_limit = $${idx++}`)
    values.push(limits.monthlyLimit)
  }
  if (limits.alertThreshold !== undefined) {
    updates.push(`alert_threshold = $${idx++}`)
    values.push(limits.alertThreshold)
  }
  updates.push('updated_at = NOW()')

  const { rows } = await pool.query(`
    INSERT INTO ops.agent_budgets (agent_id, daily_limit, weekly_limit, monthly_limit, alert_threshold)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (agent_id) DO UPDATE SET ${updates.join(', ')}
    RETURNING *
  `, [
    agentId,
    limits.dailyLimit ?? null,
    limits.weeklyLimit ?? null,
    limits.monthlyLimit ?? null,
    limits.alertThreshold ?? 80
  ])

  const r = rows[0]
  return {
    agentId: r.agent_id,
    dailyLimit: r.daily_limit ? Number(r.daily_limit) : null,
    weeklyLimit: r.weekly_limit ? Number(r.weekly_limit) : null,
    monthlyLimit: r.monthly_limit ? Number(r.monthly_limit) : null,
    alertThreshold: Number(r.alert_threshold),
    isPaused: r.is_paused,
    pausedAt: r.paused_at,
    pausedReason: r.paused_reason,
  }
}

/**
 * Pause an agent (budget exceeded)
 */
export async function pauseAgent(agentId: string, reason: string): Promise<void> {
  await pool.query(`
    UPDATE ops.agent_budgets
    SET is_paused = TRUE, paused_at = NOW(), paused_reason = $2, updated_at = NOW()
    WHERE agent_id = $1
  `, [agentId, reason])
}

/**
 * Resume a paused agent
 */
export async function resumeAgent(agentId: string): Promise<void> {
  await pool.query(`
    UPDATE ops.agent_budgets
    SET is_paused = FALSE, paused_at = NULL, paused_reason = NULL, updated_at = NOW()
    WHERE agent_id = $1
  `, [agentId])
}

export interface BudgetStatus {
  agentId: string
  budget: AgentBudget
  currentSpend: {
    daily: number
    weekly: number
    monthly: number
  }
  percentUsed: {
    daily: number | null
    weekly: number | null
    monthly: number | null
  }
  alerts: Array<'daily' | 'weekly' | 'monthly'>
  overBudget: Array<'daily' | 'weekly' | 'monthly'>
}

/**
 * Check budget status for an agent
 */
export async function checkBudgetStatus(agentId: string): Promise<BudgetStatus> {
  const budget = await getAgentBudget(agentId)

  // Get current spend for different periods
  const { rows: [dailyRow] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0) as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date = CURRENT_DATE
  `, [agentId])

  const { rows: [weeklyRow] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0) as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date >= date_trunc('week', CURRENT_DATE)
  `, [agentId])

  const { rows: [monthlyRow] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0) as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
  `, [agentId])

  const currentSpend = {
    daily: Number(dailyRow.spend),
    weekly: Number(weeklyRow.spend),
    monthly: Number(monthlyRow.spend),
  }

  const percentUsed = {
    daily: budget.dailyLimit ? (currentSpend.daily / budget.dailyLimit) * 100 : null,
    weekly: budget.weeklyLimit ? (currentSpend.weekly / budget.weeklyLimit) * 100 : null,
    monthly: budget.monthlyLimit ? (currentSpend.monthly / budget.monthlyLimit) * 100 : null,
  }

  const alerts: Array<'daily' | 'weekly' | 'monthly'> = []
  const overBudget: Array<'daily' | 'weekly' | 'monthly'> = []

  if (percentUsed.daily !== null) {
    if (percentUsed.daily >= 100) overBudget.push('daily')
    else if (percentUsed.daily >= budget.alertThreshold) alerts.push('daily')
  }
  if (percentUsed.weekly !== null) {
    if (percentUsed.weekly >= 100) overBudget.push('weekly')
    else if (percentUsed.weekly >= budget.alertThreshold) alerts.push('weekly')
  }
  if (percentUsed.monthly !== null) {
    if (percentUsed.monthly >= 100) overBudget.push('monthly')
    else if (percentUsed.monthly >= budget.alertThreshold) alerts.push('monthly')
  }

  return {
    agentId,
    budget,
    currentSpend,
    percentUsed,
    alerts,
    overBudget,
  }
}

// ============================================================================
// Rate Limit Tracking
// ============================================================================

export interface RateLimitInfo {
  provider: string
  metricType: string  // 'rpm', 'itpm', 'otpm'
  limitValue: number
  remaining: number
  resetAt: Date | null
}

/**
 * Update rate limit info from API response headers
 */
export async function updateRateLimits(
  provider: string,
  limits: Array<{ metricType: string; limit: number; remaining: number; resetAt?: Date }>
): Promise<void> {
  for (const limit of limits) {
    await pool.query(`
      INSERT INTO ops.provider_rate_limits (provider, metric_type, limit_value, remaining, reset_at, captured_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (provider, metric_type) DO UPDATE SET
        limit_value = EXCLUDED.limit_value,
        remaining = EXCLUDED.remaining,
        reset_at = EXCLUDED.reset_at,
        captured_at = NOW()
    `, [provider, limit.metricType, limit.limit, limit.remaining, limit.resetAt ?? null])
  }
}

/**
 * Get current rate limits for a provider
 * Returns null if no recent data (within 5 minutes)
 */
export async function getProviderRateLimits(provider: string): Promise<RateLimitInfo[] | null> {
  const { rows } = await pool.query(`
    SELECT provider, metric_type, limit_value, remaining, reset_at
    FROM ops.provider_rate_limits
    WHERE provider = $1
      AND captured_at > NOW() - INTERVAL '5 minutes'
  `, [provider])

  if (rows.length === 0) return null

  return rows.map(row => ({
    provider: row.provider,
    metricType: row.metric_type,
    limitValue: row.limit_value,
    remaining: row.remaining,
    resetAt: row.reset_at,
  }))
}
