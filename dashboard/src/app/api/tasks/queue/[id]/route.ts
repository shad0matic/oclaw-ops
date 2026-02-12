import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/tasks/queue/[id] — update task (assign, start, complete, fail, cancel)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await request.json()
    const { action, agentId, result } = body

    switch (action) {
        case "assign":
            await pool.query(
                `UPDATE ops.task_queue SET agent_id = $2, status = 'assigned' WHERE id = $1`,
                [id, agentId]
            )
            break
        case "run":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'running', started_at = now() WHERE id = $1`,
                [id]
            )
            break
        case "complete":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'done', completed_at = now(), result = $2 WHERE id = $1`,
                [id, JSON.stringify(result || {})]
            )
            break
        case "fail":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'failed', completed_at = now(), result = $2 WHERE id = $1`,
                [id, JSON.stringify({ error: result || 'unknown' })]
            )
            break
        case "cancel":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'cancelled', completed_at = now() WHERE id = $1`,
                [id]
            )
            break
        case "plan":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'planned' WHERE id = $1`,
                [id]
            )
            break
        case "review":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'review' WHERE id = $1`,
                [id]
            )
            break
        case "human":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'human_todo' WHERE id = $1`,
                [id]
            )
            break
        case "requeue":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'queued', agent_id = NULL, started_at = NULL, completed_at = NULL WHERE id = $1`,
                [id]
            )
            break
        default:
            return NextResponse.json({ error: "invalid action" }, { status: 400 })
    }

    const { rows } = await pool.query(`SELECT * FROM ops.task_queue WHERE id = $1`, [id])
    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) })
}

// DELETE /api/tasks/queue/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await pool.query(`DELETE FROM ops.task_queue WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
}
