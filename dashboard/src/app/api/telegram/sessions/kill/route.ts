export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"

// POST /api/telegram/sessions/kill — kill Telegram sessions
export async function POST(request: NextRequest) {
  try {
    const { sessionKeys } = await request.json()

    if (!sessionKeys || !Array.isArray(sessionKeys) || sessionKeys.length === 0) {
      return NextResponse.json({ error: "No session keys provided" }, { status: 400 })
    }

    // Delete sessions from live_sessions table
    const placeholders = sessionKeys.map((_, i) => `$${i + 1}`).join(',')
    const result = await pool.query(`
      DELETE FROM ops.live_sessions
      WHERE session_key = ANY($1::text[])
      RETURNING session_key
    `, [sessionKeys])

    return NextResponse.json({
      success: true,
      message: `Killed ${result.rowCount} Telegram session(s)`,
      killedSessions: result.rows.map((r: any) => r.session_key),
    })
  } catch (error) {
    console.error("Kill Telegram sessions error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
