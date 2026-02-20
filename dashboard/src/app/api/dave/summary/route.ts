export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import {
  ensureDaveTables,
  getTodaySpend,
  getPeriodSpend,
  getAllBudgets,
  checkBudgetStatus,
  centsToUsd,
  centsToEur,
} from "@/lib/dave"

/**
 * GET /api/dave/summary
 *
 * Returns a comprehensive summary for dashboard display:
 * - Today's spend
 * - This week's spend
 * - This month's spend
 * - Budget status for all agents with budgets
 * - Alerts
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDaveTables()

    // Get all spend data in parallel
    const [todayResult, weekResult, monthResult, budgets] = await Promise.all([
      getTodaySpend(),
      getPeriodSpend('week'),
      getPeriodSpend('month'),
      getAllBudgets(),
    ])

    // Get budget status for all agents with budgets
    const budgetStatuses = await Promise.all(
      budgets.map(b => checkBudgetStatus(b.agentId))
    )

    // Collect alerts
    const alerts: Array<{
      agentId: string
      level: 'warning' | 'critical'
      type: 'daily' | 'weekly' | 'monthly'
      percentUsed: number
      limitCents: number
      spentCents: number
    }> = []

    for (const status of budgetStatuses) {
      for (const period of status.alerts) {
        const limit = period === 'daily' ? status.budget.dailyLimit
          : period === 'weekly' ? status.budget.weeklyLimit
          : status.budget.monthlyLimit
        const spent = status.currentSpend[period]
        const pct = status.percentUsed[period]

        if (limit && pct !== null) {
          alerts.push({
            agentId: status.agentId,
            level: 'warning',
            type: period,
            percentUsed: pct,
            limitCents: limit,
            spentCents: spent,
          })
        }
      }

      for (const period of status.overBudget) {
        const limit = period === 'daily' ? status.budget.dailyLimit
          : period === 'weekly' ? status.budget.weeklyLimit
          : status.budget.monthlyLimit
        const spent = status.currentSpend[period]
        const pct = status.percentUsed[period]

        if (limit && pct !== null) {
          alerts.push({
            agentId: status.agentId,
            level: 'critical',
            type: period,
            percentUsed: pct,
            limitCents: limit,
            spentCents: spent,
          })
        }
      }
    }

    // Paused agents
    const pausedAgents = budgetStatuses
      .filter(s => s.budget.isPaused)
      .map(s => ({
        agentId: s.agentId,
        pausedAt: s.budget.pausedAt,
        reason: s.budget.pausedReason,
      }))

    return NextResponse.json({
      today: {
        totalCents: todayResult.totalCents,
        totalUsd: centsToUsd(todayResult.totalCents),
        totalEur: centsToEur(todayResult.totalCents),
        byAgent: todayResult.byAgent.map(a => ({
          agentId: a.agentId,
          costCents: a.costCents,
          costUsd: centsToUsd(a.costCents),
          callCount: a.callCount,
        })),
      },
      week: {
        totalCents: weekResult.totalCents,
        totalUsd: centsToUsd(weekResult.totalCents),
        totalEur: centsToEur(weekResult.totalCents),
        byTier: weekResult.byTier,
      },
      month: {
        totalCents: monthResult.totalCents,
        totalUsd: centsToUsd(monthResult.totalCents),
        totalEur: centsToEur(monthResult.totalCents),
        byTier: monthResult.byTier,
      },
      budgets: budgetStatuses.map(s => ({
        agentId: s.agentId,
        isPaused: s.budget.isPaused,
        daily: s.budget.dailyLimit ? {
          limit: s.budget.dailyLimit,
          limitUsd: centsToUsd(s.budget.dailyLimit),
          spent: s.currentSpend.daily,
          spentUsd: centsToUsd(s.currentSpend.daily),
          percentUsed: s.percentUsed.daily,
          remaining: Math.max(0, s.budget.dailyLimit - s.currentSpend.daily),
        } : null,
        weekly: s.budget.weeklyLimit ? {
          limit: s.budget.weeklyLimit,
          limitUsd: centsToUsd(s.budget.weeklyLimit),
          spent: s.currentSpend.weekly,
          spentUsd: centsToUsd(s.currentSpend.weekly),
          percentUsed: s.percentUsed.weekly,
          remaining: Math.max(0, s.budget.weeklyLimit - s.currentSpend.weekly),
        } : null,
        monthly: s.budget.monthlyLimit ? {
          limit: s.budget.monthlyLimit,
          limitUsd: centsToUsd(s.budget.monthlyLimit),
          spent: s.currentSpend.monthly,
          spentUsd: centsToUsd(s.currentSpend.monthly),
          percentUsed: s.percentUsed.monthly,
          remaining: Math.max(0, s.budget.monthlyLimit - s.currentSpend.monthly),
        } : null,
      })),
      alerts: alerts.sort((a, b) => {
        // Critical first, then by percent used
        if (a.level !== b.level) return a.level === 'critical' ? -1 : 1
        return b.percentUsed - a.percentUsed
      }),
      pausedAgents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Dave summary error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
