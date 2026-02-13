export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

export async function GET(req: Request) {

    try {
        const workflowsResult = await pool.query(`
            SELECT 
                w.*,
                (SELECT COUNT(*) FROM ops.runs r WHERE r.workflow_id = w.id) as total_runs,
                lr.status as last_run_status,
                lr.created_at as last_run_at
            FROM 
                ops.workflows w
            LEFT JOIN LATERAL (
                SELECT status, created_at
                FROM ops.runs r
                WHERE r.workflow_id = w.id
                ORDER BY r.created_at DESC
                LIMIT 1
            ) lr ON true
            ORDER BY w.name ASC;
        `)

        const workflows = workflowsResult.rows.map(wf => ({
            ...wf,
            id: wf.id.toString(),
            total_runs: parseInt(wf.total_runs, 10)
        }))

        return NextResponse.json(workflows)
    } catch (error) {
        console.error("Failed to fetch workflows", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
