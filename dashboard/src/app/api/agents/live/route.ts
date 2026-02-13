export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// GET /api/agents/live — returns live session data per agent from ops.live_sessions
export async function GET() {
  try {
    // Per-agent summary: active session count + most recent session details
    const { rows: agentSummary } = await pool.query(`
      SELECT 
        agent_id,
        COUNT(*) FILTER (WHERE is_active) as active_sessions,
        MAX(updated_at) as last_activity,
        SUM(total_tokens) as total_tokens,
        (SELECT label FROM ops.live_sessions ls2 
         WHERE ls2.agent_id = ls.agent_id AND ls2.is_active = true 
         ORDER BY ls2.updated_at DESC LIMIT 1) as current_task,
        (SELECT model FROM ops.live_sessions ls3 
         WHERE ls3.agent_id = ls.agent_id AND ls3.is_active = true 
         ORDER BY ls3.updated_at DESC LIMIT 1) as current_model
      FROM ops.live_sessions ls
      GROUP BY agent_id
      ORDER BY agent_id
    `)

    // Also get all active sessions for detail view
    const { rows: activeSessions } = await pool.query(`
      SELECT agent_id, session_key, kind, model, label, total_tokens, updated_at
      FROM ops.live_sessions
      WHERE is_active = true
      ORDER BY updated_at DESC
    `)

    // Get last poll time
    const { rows: pollTime } = await pool.query(`
      SELECT MAX(polled_at) as last_polled FROM ops.live_sessions
    `)

    return NextResponse.json({
      agents: agentSummary.map((r: any) => ({
        agentId: r.agent_id,
        activeSessions: parseInt(r.active_sessions) || 0,
        lastActivity: r.last_activity,
        totalTokens: parseInt(r.total_tokens) || 0,
        currentTask: r.current_task,
        currentModel: r.current_model,
      })),
      activeSessions: activeSessions.map((r: any) => ({
        agentId: r.agent_id,
        sessionKey: r.session_key,
        kind: r.kind,
        model: r.model,
        label: r.label,
        totalTokens: parseInt(r.total_tokens) || 0,
        updatedAt: r.updated_at,
      })),
      lastPolled: pollTime[0]?.last_polled || null,
    })
  } catch (error) {
    console.error("Live sessions error:", error)
    return NextResponse.json({ agents: [], activeSessions: [], lastPolled: null }, { status: 500 })
  }
}
