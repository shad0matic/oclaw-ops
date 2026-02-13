export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        const runResult = await pool.query(`
            SELECT r.*, w.id as workflow_id, w.name as workflow_name, w.description as workflow_description
            FROM ops.runs r
            LEFT JOIN ops.workflows w ON r.workflow_id = w.id
            WHERE r.id = $1
        `, [id])

        if (runResult.rowCount === 0) {
            return NextResponse.json({ error: "Run not found" }, { status: 404 })
        }

        const run = {
            ...runResult.rows[0],
            id: runResult.rows[0].id.toString(),
            workflows: {
                id: runResult.rows[0].workflow_id.toString(),
                name: runResult.rows[0].workflow_name,
                description: runResult.rows[0].workflow_description
            }
        }
        delete run.workflow_id
        delete run.workflow_name
        delete run.workflow_description

        const stepsResult = await pool.query(`
            SELECT * FROM ops.run_steps
            WHERE run_id = $1
            ORDER BY step_order ASC
        `, [id])
        
        const steps = stepsResult.rows.map(step => ({
            ...step,
            id: step.id.toString(),
            run_id: step.run_id.toString()
        }))

        return NextResponse.json({ ...run, steps })
    } catch (error) {
        console.error("Failed to fetch run", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
