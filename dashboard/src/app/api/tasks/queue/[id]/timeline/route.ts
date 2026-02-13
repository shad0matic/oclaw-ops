export const dynamic = "force-dynamic"
import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/tasks/queue/[id]/timeline — get activity timeline for a task
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const numId = Number(id)
    if (!Number.isInteger(numId) || numId <= 0) {
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    const { rows } = await pool.query(`
        SELECT event_type, agent_id, detail, created_at
        FROM ops.agent_events
        WHERE task_id = $1
        ORDER BY created_at ASC
    `, [numId])

    return NextResponse.json(rows)
}
