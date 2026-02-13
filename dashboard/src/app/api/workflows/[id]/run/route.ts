export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"
import { parseNumericId } from "@/lib/validate"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id: rawId } = await params
    const [id, idErr] = parseNumericId(rawId)
    if (idErr) return idErr

    try {
        const body = await req.json()
        const { task, context } = body

        const workflowResult = await pool.query(`SELECT * FROM ops.workflows WHERE id = $1`, [id])
        if (workflowResult.rowCount === 0) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
        }
        const workflow = workflowResult.rows[0]

        if (!workflow.enabled) {
            return NextResponse.json(
                { error: "Workflow is disabled" },
                { status: 400 }
            )
        }

        const runResult = await pool.query(`
            INSERT INTO ops.runs (workflow_id, workflow_name, task, status, triggered_by, context, result)
            VALUES ($1, $2, $3, 'pending', $4, $5, '{}')
            RETURNING *
        `, [
            workflow.id,
            workflow.name,
            task || "Manual trigger from dashboard",
            "boss",
            context || {}
        ])
        const run = runResult.rows[0]
        run.id = run.id.toString()
        run.workflow_id = run.workflow_id.toString()

        return NextResponse.json(run)
    } catch (error) {
        console.error("Failed to trigger workflow run", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
