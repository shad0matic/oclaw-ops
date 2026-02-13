export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const workflowId = searchParams.get("workflow_id")

    try {
        let query = `
            SELECT r.*, w.name as workflow_name
            FROM ops.runs r
            LEFT JOIN ops.workflows w ON r.workflow_id = w.id
        `
        const values = []
        const whereClauses = []

        if (status) {
            whereClauses.push(`r.status = $${values.length + 1}`)
            values.push(status)
        }
        if (workflowId) {
            whereClauses.push(`r.workflow_id = $${values.length + 1}`)
            values.push(parseInt(workflowId))
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`
        }
        
        query += ` ORDER BY r.created_at DESC LIMIT $${values.length + 1}`
        values.push(limit)

        const runsResult = await pool.query(query, values)
        const runs = runsResult.rows.map(run => ({
            ...run,
            id: run.id.toString(),
            workflow_id: run.workflow_id.toString(),
            workflows: {
                name: run.workflow_name
            }
        }))

        return NextResponse.json(runs)
    } catch (error) {
        console.error("Failed to fetch runs", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
