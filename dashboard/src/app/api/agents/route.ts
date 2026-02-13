export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(req: Request) {

    try {
        const agentsResult = await pool.query(`SELECT * FROM memory.agent_profiles ORDER BY agent_id ASC`)
        const agents = agentsResult.rows

        // Enrich with status
        // For each agent, check if they have active steps
        const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
            const activeStepResult = await pool.query(
                `SELECT * FROM ops.steps WHERE agent_id = $1 AND status = 'running' LIMIT 1`,
                [agent.agent_id]
            )
            const activeStep = activeStepResult.rows[0]

            const lastActiveResult = await pool.query(
                `SELECT * FROM ops.agent_events WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [agent.agent_id]
            )
            const lastActive = lastActiveResult.rows[0]

            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const [todayTotalResult, todayCompletedResult] = await Promise.all([
                pool.query(
                    `SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1 AND created_at >= $2`,
                    [agent.agent_id, todayStart]
                ),
                pool.query(
                    `SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1 AND created_at >= $2 AND event_type IN ('task_complete', 'step_complete', 'phase_complete', 'run_completed')`,
                    [agent.agent_id, todayStart]
                )
            ])
            const todayTotal = todayTotalResult.rows[0].count
            const todayCompleted = todayCompletedResult.rows[0].count

            return {
                ...agent,
                status: activeStep ? "running" : "idle",
                last_active: lastActive?.created_at || agent.updated_at,
                today_tasks: todayTotal,
                today_completed: todayCompleted,
            }
        }))

        return NextResponse.json(enrichedAgents)
    } catch (error) {
        console.error("Failed to fetch agents", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
