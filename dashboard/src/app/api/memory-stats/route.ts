export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

const MODEL_MAX_TOKENS = 131072

function healthFromPct(pct: number) {
  if (pct >= 95) return "critical"
  if (pct >= 80) return "warning"
  return "healthy"
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const agentId = url.searchParams.get("agent_id") || "main"

  try {
    // Tier 1: best-effort estimate from ops.live_sessions (not exact "prompt" length).
    const liveSession = await pool.query(
      `SELECT agent_id, model, total_tokens, input_tokens, output_tokens, updated_at
       FROM ops.live_sessions
       WHERE agent_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [agentId]
    )

    const t1 = liveSession.rows[0]
    const tier1_total_tokens = t1?.total_tokens ? Number(t1.total_tokens) : 0
    const tier1_usage_pct = Math.min(100, (tier1_total_tokens / MODEL_MAX_TOKENS) * 100)

    // Tier 2: flush count from memory.memories tagged memory-flush
    const flush24h = await pool.query(
      `SELECT COUNT(*)::int as c
       FROM memory.memories
       WHERE agent_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'
         AND tags @> ARRAY['memory-flush']::text[]`,
      [agentId]
    )

    const flush1h = await pool.query(
      `SELECT COUNT(*)::int as c
       FROM memory.memories
       WHERE agent_id = $1
         AND created_at >= NOW() - INTERVAL '1 hour'
         AND tags @> ARRAY['memory-flush']::text[]`,
      [agentId]
    )

    const lastFlush = await pool.query(
      `SELECT created_at
       FROM memory.memories
       WHERE agent_id = $1
         AND tags @> ARRAY['memory-flush']::text[]
       ORDER BY created_at DESC
       LIMIT 1`,
      [agentId]
    )

    // Tier 3: storage stats
    const totalMemories = await pool.query(
      `SELECT COUNT(*)::int as c FROM memory.memories WHERE agent_id = $1`,
      [agentId]
    )
    const totalDailyNotes = await pool.query(`SELECT COUNT(*)::int as c FROM memory.daily_notes`)

    const t1Health: "healthy" | "warning" | "critical" = healthFromPct(tier1_usage_pct)
    const tier2Health: "healthy" | "warning" | "critical" = flush24h.rows[0].c >= 20 ? "warning" : "healthy"
    const tier3Health: "healthy" | "warning" | "critical" = totalMemories.rows[0].c > 0 ? "healthy" : "warning"

    // Only Tier 1 can currently go critical (Tier 2/3 critical thresholds come later)
    const overall: "healthy" | "warning" | "critical" =
      t1Health === "critical"
        ? "critical"
        : t1Health === "warning" || tier2Health === "warning" || tier3Health === "warning"
          ? "warning"
          : "healthy"

    return NextResponse.json({
      agent_id: agentId,
      overall_health: overall,
      tier1_active_context: {
        model: t1?.model || null,
        // This is NOT exact prompt length; it is a best-effort proxy from live session totals.
        total_tokens_estimate: tier1_total_tokens,
        usage_percentage_estimate: Number(tier1_usage_pct.toFixed(2)),
        context_health: t1Health,
        updated_at: t1?.updated_at || null,
      },
      tier2_memory_flush: {
        flush_count_1h: flush1h.rows[0].c,
        flush_count_24h: flush24h.rows[0].c,
        last_flush_at: lastFlush.rows[0]?.created_at || null,
        flush_health: tier2Health,
      },
      tier3_longterm_storage: {
        total_memories: totalMemories.rows[0].c,
        total_daily_notes: totalDailyNotes.rows[0].c,
        storage_health: tier3Health,
      },
      limits: {
        model_max_tokens: MODEL_MAX_TOKENS,
      },
      notes: {
        tier1_is_estimate: true,
        tier1_source: "ops.live_sessions.total_tokens",
      },
    })
  } catch (error) {
    console.error("Failed to fetch memory KPIs", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
