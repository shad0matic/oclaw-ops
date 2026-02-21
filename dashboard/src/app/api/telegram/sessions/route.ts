export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// GET /api/telegram/sessions — returns Telegram session data
export async function GET() {
  try {
    const { rows: sessions } = await pool.query(`
      SELECT 
        id,
        agent_id,
        session_key,
        label,
        total_tokens,
        is_active,
        updated_at
      FROM ops.live_sessions
      WHERE session_key LIKE '%telegram%'
      ORDER BY updated_at DESC
      LIMIT 50
    `)

    return NextResponse.json({
      sessions: sessions.map((r: any) => ({
        id: r.id,
        agentId: r.agent_id,
        sessionKey: r.session_key,
        label: r.label,
        totalTokens: parseInt(r.total_tokens) || 0,
        isActive: r.is_active,
        updatedAt: r.updated_at,
      })),
    })
  } catch (error) {
    console.error("Telegram sessions error:", error)
    return NextResponse.json({ sessions: [] }, { status: 500 })
  }
}
