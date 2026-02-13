export const dynamic = "force-dynamic"
import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Notify Kevin's main session when task status changes
async function notifyKevin(task: any, action: string) {
    const gwToken = process.env.OPENCLAW_GW_TOKEN
    if (!gwToken) return
    const emoji = action === 'run' ? '⚡' : '📋'
    const msg = `${emoji} Kanban: #${task.id} "${task.title}" → ${action}${task.agent_id ? ` (assigned: ${task.agent_id})` : ' (unassigned)'}\nProject: ${task.project || 'unknown'}\nDescription: ${(task.description || 'none').substring(0, 200)}`
    await fetch('http://127.0.0.1:18789/api/sessions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gwToken}` },
        body: JSON.stringify({
            sessionKey: 'agent:main:telegram:group:-1003396419207:topic:710',
            message: msg,
        }),
    })
}

// PATCH /api/tasks/queue/[id] — update task (assign, start, complete, fail, cancel)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await request.json()
    const { action, agentId, result, reviewerId, reviewFeedback } = body

    switch (action) {
        case "assign":
            await pool.query(
                `UPDATE ops.task_queue SET agent_id = $2, status = 'assigned' WHERE id = $1`,
                [id, agentId]
            )
            break
        case "run":
            if (agentId) {
                await pool.query(
                    `UPDATE ops.task_queue SET status = 'running', agent_id = $2, started_at = now() WHERE id = $1`,
                    [id, agentId]
                )
            } else {
                await pool.query(
                    `UPDATE ops.task_queue SET status = 'running', started_at = now() WHERE id = $1`,
                    [id]
                )
            }
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
            {
                const { reviewerId, reviewFeedback } = body
                await pool.query(
                    `UPDATE ops.task_queue SET status = 'review', review_count = review_count + 1, reviewer_id = $2, review_feedback = $3 WHERE id = $1`,
                    [id, reviewerId, reviewFeedback]
                )
            }
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
        case "approve":
            await pool.query(
                `UPDATE ops.task_queue SET status = 'human_todo' WHERE id = $1`,
                [id]
            )
            break
        case "reject":
            {
                const { reviewFeedback } = body
                await pool.query(
                    `UPDATE ops.task_queue SET status = 'running', review_feedback = $2 WHERE id = $1`,
                    [id, reviewFeedback]
                )
            }
            break
        case "update":
            {
                const { fields } = body
                if (!fields || typeof fields !== 'object') return NextResponse.json({ error: "fields required" }, { status: 400 })
                const allowed = ['title', 'description', 'priority', 'project', 'agent_id']
                const sets: string[] = []
                const vals: any[] = []
                for (const [k, v] of Object.entries(fields)) {
                    if (allowed.includes(k)) {
                        vals.push(v)
                        sets.push(`${k} = $${vals.length + 1}`)
                    }
                }
                if (sets.length === 0) return NextResponse.json({ error: "no valid fields" }, { status: 400 })
                vals.unshift(id)
                await pool.query(`UPDATE ops.task_queue SET ${sets.join(', ')} WHERE id = $1`, vals)
            }
            break
        default:
            return NextResponse.json({ error: "invalid action" }, { status: 400 })
    }

    const { rows } = await pool.query(`SELECT * FROM ops.task_queue WHERE id = $1`, [id])
    const task = { ...rows[0], id: Number(rows[0].id) }

    // Fire-and-forget: notify Kevin when task moves to running/planned
    if (action === 'run' || action === 'plan') {
        notifyKevin(task, action).catch(() => {})
    }

    return NextResponse.json(task)
}

// DELETE /api/tasks/queue/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await pool.query(`DELETE FROM ops.task_queue WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
}
