export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// GET /api/phone/calls — returns phone call history
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        from_number as "fromNumber",
        to_number as "toNumber",
        direction,
        status,
        duration,
        recording_url as "recordingUrl",
        transcription,
        agent_id as "agentId",
        session_key as "sessionKey",
        created_at as "createdAt",
        ended_at as "endedAt"
      FROM ops.phone_calls
      ORDER BY created_at DESC
      LIMIT 100
    `)

    return NextResponse.json({ calls: rows })
  } catch (error) {
    console.error("Phone calls error:", error)
    return NextResponse.json({ calls: [] }, { status: 500 })
  }
}
