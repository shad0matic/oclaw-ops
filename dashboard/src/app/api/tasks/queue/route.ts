import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/tasks/queue?project=infra&status=queued
export async function GET(request: NextRequest) {
    const project = request.nextUrl.searchParams.get("project")
    const status = request.nextUrl.searchParams.get("status")

    let where = "WHERE 1=1"
    const params: any[] = []
    if (project) { params.push(project); where += ` AND q.project = $${params.length}` }
    if (status) { params.push(status); where += ` AND q.status = $${params.length}` }

    const { rows } = await pool.query(`
        SELECT q.*, p.name as agent_name
        FROM ops.task_queue q
        LEFT JOIN memory.agent_profiles p ON p.agent_id = q.agent_id
        ${where}
        ORDER BY 
            CASE q.status WHEN 'running' THEN 0 WHEN 'assigned' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END,
            q.priority DESC, q.created_at ASC
    `, params)

    const tasks = rows.map((r: any) => ({
        ...r,
        id: Number(r.id),
        priority: Number(r.priority),
    }))

    return NextResponse.json(tasks)
}

// POST /api/tasks/queue — create a new task
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { title, description, project = "infra", agentId, priority = 5 } = body

    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

    const { rows } = await pool.query(`
        INSERT INTO ops.task_queue (title, description, project, agent_id, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `, [title, description || null, project, agentId || null, priority, agentId ? 'assigned' : 'queued'])

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) }, { status: 201 })
}
