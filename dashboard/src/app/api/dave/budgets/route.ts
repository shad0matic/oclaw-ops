export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  ensureDaveTables,
  getAllBudgets,
  getAgentBudget,
  setAgentBudget,
  pauseAgent,
  resumeAgent,
  checkBudgetStatus,
  centsToUsd,
  centsToEur,
} from "@/lib/dave"

// Schema for setting budget
const setBudgetSchema = z.object({
  agentId: z.string().min(1, "agentId required"),
  dailyLimit: z.number().int().min(0).nullable().optional(),
  weeklyLimit: z.number().int().min(0).nullable().optional(),
  monthlyLimit: z.number().int().min(0).nullable().optional(),
  alertThreshold: z.number().int().min(0).max(100).optional(),
})

const pauseSchema = z.object({
  agentId: z.string().min(1, "agentId required"),
  action: z.enum(['pause', 'resume']),
  reason: z.string().optional(),
})

/**
 * GET /api/dave/budgets
 *
 * Query params:
 *   - agent: get budget for specific agent (includes spend status)
 *   - (none): list all budgets
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDaveTables()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent')

    if (agentId) {
      // Get detailed status for specific agent
      const status = await checkBudgetStatus(agentId)

      return NextResponse.json({
        agentId: status.agentId,
        budget: {
          daily: status.budget.dailyLimit ? {
            limit: status.budget.dailyLimit,
            limitUsd: centsToUsd(status.budget.dailyLimit),
          } : null,
          weekly: status.budget.weeklyLimit ? {
            limit: status.budget.weeklyLimit,
            limitUsd: centsToUsd(status.budget.weeklyLimit),
          } : null,
          monthly: status.budget.monthlyLimit ? {
            limit: status.budget.monthlyLimit,
            limitUsd: centsToUsd(status.budget.monthlyLimit),
          } : null,
          alertThreshold: status.budget.alertThreshold,
        },
        isPaused: status.budget.isPaused,
        pausedAt: status.budget.pausedAt,
        pausedReason: status.budget.pausedReason,
        currentSpend: {
          daily: {
            cents: status.currentSpend.daily,
            usd: centsToUsd(status.currentSpend.daily),
          },
          weekly: {
            cents: status.currentSpend.weekly,
            usd: centsToUsd(status.currentSpend.weekly),
          },
          monthly: {
            cents: status.currentSpend.monthly,
            usd: centsToUsd(status.currentSpend.monthly),
          },
        },
        percentUsed: status.percentUsed,
        alerts: status.alerts,
        overBudget: status.overBudget,
      })
    }

    // List all budgets
    const budgets = await getAllBudgets()

    // Get current spend for each
    const budgetsWithStatus = await Promise.all(
      budgets.map(async (b) => {
        const status = await checkBudgetStatus(b.agentId)
        return {
          agentId: b.agentId,
          dailyLimit: b.dailyLimit,
          dailyLimitUsd: b.dailyLimit ? centsToUsd(b.dailyLimit) : null,
          weeklyLimit: b.weeklyLimit,
          weeklyLimitUsd: b.weeklyLimit ? centsToUsd(b.weeklyLimit) : null,
          monthlyLimit: b.monthlyLimit,
          monthlyLimitUsd: b.monthlyLimit ? centsToUsd(b.monthlyLimit) : null,
          alertThreshold: b.alertThreshold,
          isPaused: b.isPaused,
          currentDailySpend: status.currentSpend.daily,
          currentDailySpendUsd: centsToUsd(status.currentSpend.daily),
          dailyPercentUsed: status.percentUsed.daily,
          hasAlerts: status.alerts.length > 0,
          isOverBudget: status.overBudget.length > 0,
        }
      })
    )

    return NextResponse.json({ budgets: budgetsWithStatus })
  } catch (error) {
    console.error("Dave budgets GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/dave/budgets
 *
 * Set budget for an agent
 *
 * Body:
 *   - agentId: string
 *   - dailyLimit?: number (cents) or null to clear
 *   - weeklyLimit?: number (cents) or null to clear
 *   - monthlyLimit?: number (cents) or null to clear
 *   - alertThreshold?: number (0-100, default 80)
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDaveTables()

    const body = await request.json()
    const parsed = setBudgetSchema.parse(body)

    const budget = await setAgentBudget(parsed.agentId, {
      dailyLimit: parsed.dailyLimit,
      weeklyLimit: parsed.weeklyLimit,
      monthlyLimit: parsed.monthlyLimit,
      alertThreshold: parsed.alertThreshold,
    })

    return NextResponse.json({
      success: true,
      budget: {
        agentId: budget.agentId,
        dailyLimit: budget.dailyLimit,
        dailyLimitUsd: budget.dailyLimit ? centsToUsd(budget.dailyLimit) : null,
        weeklyLimit: budget.weeklyLimit,
        weeklyLimitUsd: budget.weeklyLimit ? centsToUsd(budget.weeklyLimit) : null,
        monthlyLimit: budget.monthlyLimit,
        monthlyLimitUsd: budget.monthlyLimit ? centsToUsd(budget.monthlyLimit) : null,
        alertThreshold: budget.alertThreshold,
        isPaused: budget.isPaused,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Dave budgets POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/dave/budgets
 *
 * Pause or resume an agent
 *
 * Body:
 *   - agentId: string
 *   - action: 'pause' | 'resume'
 *   - reason?: string (for pause)
 */
export async function PATCH(request: NextRequest) {
  try {
    await ensureDaveTables()

    const body = await request.json()
    const parsed = pauseSchema.parse(body)

    if (parsed.action === 'pause') {
      await pauseAgent(parsed.agentId, parsed.reason || 'Manual pause')
      return NextResponse.json({
        success: true,
        agentId: parsed.agentId,
        action: 'paused',
        reason: parsed.reason || 'Manual pause',
      })
    } else {
      await resumeAgent(parsed.agentId)
      return NextResponse.json({
        success: true,
        agentId: parsed.agentId,
        action: 'resumed',
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Dave budgets PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
