/**
 * /api/dave/check — Pre-flight budget check endpoint
 * 
 * GET /api/dave/check?agent=<id>&cost=<cents>
 * 
 * Returns:
 * {
 *   "allowed": true/false,
 *   "status": "ok" | "warning" | "over_budget" | "paused" | "no_budget",
 *   "alerts": [...],
 *   "blocks": [...],
 *   "currentSpend": { daily, weekly, monthly },
 *   "projectedSpend": { daily, weekly, monthly }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/drizzle'

export const dynamic = 'force-dynamic'

interface BudgetCheckResult {
  allowed: boolean
  status: 'ok' | 'warning' | 'over_budget' | 'paused' | 'no_budget' | 'error'
  alerts?: Array<{
    period: string
    percent: number
    limit: number
    current: number
  }>
  blocks?: Array<{
    period: string
    percent: number
    limit: number
    current: number
  }>
  currentSpend?: {
    daily: number
    weekly: number
    monthly: number
  }
  projectedSpend?: {
    daily: number
    weekly: number
    monthly: number
  }
  reason?: string
  error?: string
}

async function checkBudget(agentId: string, estimatedCostCents = 0): Promise<BudgetCheckResult> {
  try {
    // Get budget configuration
    const { rows: budgetRows } = await pool.query(`
      SELECT 
        daily_limit,
        weekly_limit,
        monthly_limit,
        alert_threshold,
        is_paused,
        paused_reason
      FROM ops.agent_budgets
      WHERE agent_id = $1
    `, [agentId])

    // No budget configured = always allow
    if (budgetRows.length === 0) {
      return { allowed: true, status: 'no_budget' }
    }

    const budget = budgetRows[0]

    // Agent is paused = hard block
    if (budget.is_paused) {
      return {
        allowed: false,
        status: 'paused',
        reason: budget.paused_reason || 'Agent paused by Dave',
      }
    }

    // Get current spend for different periods
    const { rows: [dailyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date = CURRENT_DATE
    `, [agentId])

    const { rows: [weeklyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date >= date_trunc('week', CURRENT_DATE)
    `, [agentId])

    const { rows: [monthlyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
    `, [agentId])

    const currentSpend = {
      daily: dailyRow.spend,
      weekly: weeklyRow.spend,
      monthly: monthlyRow.spend,
    }

    // Project spend after this call
    const projectedSpend = {
      daily: currentSpend.daily + estimatedCostCents,
      weekly: currentSpend.weekly + estimatedCostCents,
      monthly: currentSpend.monthly + estimatedCostCents,
    }

    // Calculate percentages
    const alerts: BudgetCheckResult['alerts'] = []
    const blocks: BudgetCheckResult['blocks'] = []

    if (budget.daily_limit) {
      const pct = (projectedSpend.daily / budget.daily_limit) * 100
      if (pct >= 100) {
        blocks.push({ period: 'daily', percent: pct, limit: budget.daily_limit, current: currentSpend.daily })
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'daily', percent: pct, limit: budget.daily_limit, current: currentSpend.daily })
      }
    }

    if (budget.weekly_limit) {
      const pct = (projectedSpend.weekly / budget.weekly_limit) * 100
      if (pct >= 100) {
        blocks.push({ period: 'weekly', percent: pct, limit: budget.weekly_limit, current: currentSpend.weekly })
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'weekly', percent: pct, limit: budget.weekly_limit, current: currentSpend.weekly })
      }
    }

    if (budget.monthly_limit) {
      const pct = (projectedSpend.monthly / budget.monthly_limit) * 100
      if (pct >= 100) {
        blocks.push({ period: 'monthly', percent: pct, limit: budget.monthly_limit, current: currentSpend.monthly })
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'monthly', percent: pct, limit: budget.monthly_limit, current: currentSpend.monthly })
      }
    }

    // If any budget is exceeded, block and auto-pause
    if (blocks.length > 0) {
      await pool.query(`
        UPDATE ops.agent_budgets
        SET is_paused = TRUE, 
            paused_at = NOW(), 
            paused_reason = $2,
            updated_at = NOW()
        WHERE agent_id = $1 AND is_paused = FALSE
      `, [agentId, `Budget exceeded: ${blocks.map(b => b.period).join(', ')}`])

      return {
        allowed: false,
        status: 'over_budget',
        blocks,
        alerts,
        currentSpend,
        projectedSpend,
      }
    }

    // Warnings but allowed
    if (alerts.length > 0) {
      return {
        allowed: true,
        status: 'warning',
        alerts,
        blocks: [],
        currentSpend,
        projectedSpend,
      }
    }

    // All good
    return {
      allowed: true,
      status: 'ok',
      alerts: [],
      blocks: [],
      currentSpend,
      projectedSpend,
    }

  } catch (error) {
    console.error('Budget check error:', error)
    return { 
      allowed: true, 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent')
  const costStr = searchParams.get('cost')
  const estimatedCostCents = costStr ? parseInt(costStr) : 0

  if (!agentId) {
    return NextResponse.json(
      { error: 'Missing agent parameter' },
      { status: 400 }
    )
  }

  try {
    const result = await checkBudget(agentId, estimatedCostCents)
    
    // Set HTTP status based on result
    let httpStatus = 200
    if (result.status === 'over_budget' || result.status === 'paused') {
      httpStatus = 403 // Forbidden
    } else if (result.status === 'warning') {
      httpStatus = 200 // OK but with warnings
    }

    return NextResponse.json(result, { status: httpStatus })
  } catch (error) {
    console.error('Budget check error:', error)
    return NextResponse.json(
      { error: 'Budget check failed' },
      { status: 500 }
    )
  }
}
