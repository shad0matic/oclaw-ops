export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params

    try {
        const agentResult = await pool.query(
            `SELECT * FROM memory.agent_profiles WHERE agent_id = $1`,
            [id]
        )
        const agent = agentResult.rows[0]

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        // Enrich with additional stats
        const [activeStepResult, lastActiveResult, totalEventsResult, reviewsResult] = await Promise.all([
            pool.query(
                `SELECT * FROM ops.steps WHERE agent_id = $1 AND status = 'running' LIMIT 1`,
                [id]
            ),
            pool.query(
                `SELECT * FROM ops.agent_events WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [id]
            ),
            pool.query(
                `SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1`,
                [id]
            ),
            pool.query(
                `SELECT * FROM memory.performance_reviews WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10`,
                [id]
            )
        ])

        const activeStep = activeStepResult.rows[0]
        const lastActive = lastActiveResult.rows[0]
        const totalEvents = totalEventsResult.rows[0].count
        const reviews = reviewsResult.rows

        return NextResponse.json({
            ...agent,
            status: activeStep ? "running" : "idle",
            last_active: lastActive?.created_at || agent.updated_at,
            total_events: totalEvents,
            reviews
        })
    } catch (error) {
        console.error("Failed to fetch agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params
    const body = await req.json()

    const allowed = ['description', 'name']
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
        if (body[key] !== undefined) data[key] = body[key]
    }
    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    try {
        const setClauses = Object.keys(data).map((key, i) => `${key} = $${i + 2}`).join(', ')
        const values = [id, ...Object.values(data)]
        const query = `UPDATE memory.agent_profiles SET ${setClauses}, updated_at = NOW() WHERE agent_id = $1 RETURNING *`
        const updatedResult = await pool.query(query, values)
        const updated = updatedResult.rows[0]
        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
