export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  ensureDaveTables,
  calculateTokenCost,
  logCost,
  getTodaySpend,
  getAgentSpend,
  getPeriodSpend,
  centsToUsd,
  centsToEur,
} from "@/lib/dave"

// Schema for manual cost logging
const logCostSchema = z.object({
  agentId: z.string().min(1, "agentId required"),
  model: z.string().min(1, "model required"),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cachedTokens: z.number().int().min(0).optional(),
  sessionKey: z.string().optional(),
  taskType: z.string().optional(),
  taskRef: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * GET /api/dave/costs
 *
 * Query params:
 *   - view: 'today' | 'agent' | 'week' | 'month' (default: 'today')
 *   - agent: agent ID (required if view=agent)
 *   - days: number of days for agent history (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDaveTables()

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'today'
    const agentId = searchParams.get('agent')
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7')))

    switch (view) {
      case 'today': {
        const result = await getTodaySpend()
        return NextResponse.json({
          view: 'today',
          date: new Date().toISOString().split('T')[0],
          totalCents: result.totalCents,
          totalUsd: centsToUsd(result.totalCents),
          totalEur: centsToEur(result.totalCents),
          byAgent: result.byAgent.map(a => ({
            ...a,
            costUsd: centsToUsd(a.costCents),
            costEur: centsToEur(a.costCents),
          })),
        })
      }

      case 'agent': {
        if (!agentId) {
          return NextResponse.json({ error: "agent param required for view=agent" }, { status: 400 })
        }
        const result = await getAgentSpend(agentId, days)
        return NextResponse.json({
          view: 'agent',
          agentId: result.agentId,
          days,
          totalCents: result.totalCents,
          totalUsd: centsToUsd(result.totalCents),
          totalEur: centsToEur(result.totalCents),
          callCount: result.callCount,
          history: result.history.map(h => ({
            ...h,
            costUsd: centsToUsd(h.costCents),
            costEur: centsToEur(h.costCents),
          })),
        })
      }

      case 'week': {
        const result = await getPeriodSpend('week')
        return NextResponse.json({
          view: 'week',
          totalCents: result.totalCents,
          totalUsd: centsToUsd(result.totalCents),
          totalEur: centsToEur(result.totalCents),
          byAgent: result.byAgent.map(a => ({
            ...a,
            costUsd: centsToUsd(a.costCents),
            costEur: centsToEur(a.costCents),
          })),
          byTier: result.byTier,
        })
      }

      case 'month': {
        const result = await getPeriodSpend('month')
        return NextResponse.json({
          view: 'month',
          totalCents: result.totalCents,
          totalUsd: centsToUsd(result.totalCents),
          totalEur: centsToEur(result.totalCents),
          byAgent: result.byAgent.map(a => ({
            ...a,
            costUsd: centsToUsd(a.costCents),
            costEur: centsToEur(a.costCents),
          })),
          byTier: result.byTier,
        })
      }

      default:
        return NextResponse.json({ error: `Invalid view: ${view}` }, { status: 400 })
    }
  } catch (error) {
    console.error("Dave costs GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/dave/costs
 *
 * Manually log a cost entry (for testing or manual tracking)
 *
 * Body:
 *   - agentId: string
 *   - model: string (e.g., 'claude-sonnet-4-5', 'anthropic/claude-opus-4-5')
 *   - inputTokens: number
 *   - outputTokens: number
 *   - cachedTokens?: number
 *   - sessionKey?: string
 *   - taskType?: string
 *   - taskRef?: string
 *   - metadata?: object
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDaveTables()

    const body = await request.json()
    const parsed = logCostSchema.parse(body)

    // Calculate cost from tokens
    const costResult = calculateTokenCost(parsed.model, {
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      cachedTokens: parsed.cachedTokens,
    })

    if (!costResult) {
      return NextResponse.json({
        error: `Unknown model: ${parsed.model}. Check pricing configuration.`
      }, { status: 400 })
    }

    // Log the cost
    const { id } = await logCost({
      agentId: parsed.agentId,
      provider: costResult.provider,
      model: costResult.model,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      cachedTokens: parsed.cachedTokens,
      costCents: costResult.totalCents,
      tier: costResult.tier,
      sessionKey: parsed.sessionKey,
      taskType: parsed.taskType,
      taskRef: parsed.taskRef,
      metadata: parsed.metadata,
    })

    return NextResponse.json({
      success: true,
      id,
      cost: {
        cents: costResult.totalCents,
        usd: centsToUsd(costResult.totalCents),
        eur: centsToEur(costResult.totalCents),
        breakdown: {
          inputCents: costResult.inputCents,
          outputCents: costResult.outputCents,
          cachedCents: costResult.cachedCents,
        },
        tier: costResult.tier,
        provider: costResult.provider,
        model: costResult.model,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Dave costs POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
