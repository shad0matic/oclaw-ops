export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getProviderRateLimits } from "@/lib/dave/db"

// Known provider limits (hardcoded fallback)
const PROVIDER_LIMITS = {
  anthropic: {
    name: "Anthropic (Max plan)",
    limits: [
      { type: "RPM", value: 4000, window: "1 minute" },
      { type: "ITPM", value: 400000, window: "1 minute", note: "Cached tokens don't count!" },
      { type: "OTPM", value: 80000, window: "1 minute" },
    ]
  },
  google: {
    name: "Google Gemini (free tier)",
    limits: [
      { type: "RPM (Flash)", value: 10, window: "1 minute" },
      { type: "RPM (Pro)", value: 5, window: "1 minute" },
      { type: "RPD (Flash)", value: 500, window: "1 day" },
      { type: "RPD (Pro)", value: 100, window: "1 day" },
      { type: "TPM (shared)", value: 250000, window: "1 minute" },
    ]
  },
  minimax: {
    name: "MiniMax (free portal)",
    limits: [
      { type: "RPM", value: 60, window: "1 minute", note: "Estimated" },
    ]
  },
}

// Map DB metric types to quota limit types
const METRIC_TYPE_MAP: Record<string, string> = {
  'requests': 'RPM',
  'input_tokens': 'ITPM',
  'output_tokens': 'OTPM',
}

/**
 * GET /api/dave/quotas
 * 
 * Returns current usage vs limits for all AI providers
 */
export async function GET() {
  try {
    // Get usage for last minute (RPM calculation)
    const minuteAgo = new Date(Date.now() - 60 * 1000)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const usageLastMinuteResult = await pool.query(`
      SELECT 
        CASE 
          WHEN model LIKE 'claude%' THEN 'anthropic'
          WHEN model LIKE 'gemini%' THEN 'google'
          WHEN model LIKE 'MiniMax%' THEN 'minimax'
          ELSE 'other'
        END as provider,
        COUNT(*) as calls,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cached_tokens) as cached_tokens
      FROM ops.agent_costs
      WHERE created_at > $1
      GROUP BY 1
    `, [minuteAgo])

    const usageLastDayResult = await pool.query(`
      SELECT 
        CASE 
          WHEN model LIKE 'claude%' THEN 'anthropic'
          WHEN model LIKE 'gemini%' THEN 'google'
          WHEN model LIKE 'MiniMax%' THEN 'minimax'
          ELSE 'other'
        END as provider,
        COUNT(*) as calls
      FROM ops.agent_costs
      WHERE created_at > $1
      GROUP BY 1
    `, [dayAgo])

    const usageLastMinute = usageLastMinuteResult.rows
    const usageLastDay = usageLastDayResult.rows

    // Get real rate limits from DB for Anthropic (if available)
    const anthropicRateLimits = await getProviderRateLimits('anthropic')

    // Build response
    const quotas = Object.entries(PROVIDER_LIMITS).map(([providerId, config]) => {
      const minuteUsage = usageLastMinute.find(u => u.provider === providerId)
      const dayUsage = usageLastDay.find(u => u.provider === providerId)

      return {
        provider: providerId,
        name: config.name,
        limits: config.limits.map((limit: any) => {
          let current = 0
          let limitValue = limit.value
          let source = 'hardcoded' as 'hardcoded' | 'api'

          // Use real rate limits from DB for Anthropic if available
          if (providerId === 'anthropic' && anthropicRateLimits) {
            const dbLimit = anthropicRateLimits.find(
              rl => METRIC_TYPE_MAP[rl.metricType] === limit.type
            )
            if (dbLimit) {
              limitValue = dbLimit.limitValue
              current = dbLimit.limitValue - dbLimit.remaining
              source = 'api'
            }
          }

          let percentage = 0
          if (limit.type.includes('RPM') && source === 'hardcoded') {
            current = Number(minuteUsage?.calls || 0)
            percentage = (current / limitValue) * 100
          } else if (limit.type.includes('RPD')) {
            current = Number(dayUsage?.calls || 0)
            percentage = (current / limitValue) * 100
          } else if (limit.type === 'ITPM' && source === 'hardcoded') {
            // For Anthropic, only uncached input tokens count
            current = Number(minuteUsage?.input_tokens || 0)
            percentage = (current / limitValue) * 100
          } else if (limit.type === 'OTPM' && source === 'hardcoded') {
            current = Number(minuteUsage?.output_tokens || 0)
            percentage = (current / limitValue) * 100
          } else if (limit.type === 'TPM (shared)') {
            current = Number(minuteUsage?.input_tokens || 0) + Number(minuteUsage?.output_tokens || 0)
            percentage = (current / limitValue) * 100
          }

          return {
            type: limit.type,
            current,
            limit: limitValue,
            percentage: Math.round(percentage),
            window: limit.window,
            ...(limit.note && { note: limit.note }),
            source,
            status: percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'ok'
          }
        })
      }
    })

    return NextResponse.json({ quotas })

  } catch (error) {
    console.error("Dave quotas GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
