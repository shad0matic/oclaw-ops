export const dynamic = "force-dynamic"
import { pool } from "@/lib/db"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

// GET /api/tasks?status=in_progress
export async function GET(request: NextRequest) {
    const status = request.nextUrl.searchParams.get("status")

    try {
        let query = `SELECT * FROM ops.tasks`
        const values = []

        if (status) {
            query += ` WHERE status = $1`
            values.push(status)
        }

        query += ` ORDER BY created_at DESC`

        const tasksResult = await pool.query(query, values)
        const tasks = tasksResult.rows.map(task => ({
            ...task,
            id: task.id.toString()
        }))

        return NextResponse.json(tasks)
    } catch (error: any) {
        console.error("Failed to fetch tasks", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
