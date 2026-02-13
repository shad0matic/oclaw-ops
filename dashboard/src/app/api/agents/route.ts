export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db, pool } from "@/lib/drizzle"
import { agentProfilesInMemory } from "@/lib/schema"
import { asc } from "drizzle-orm"

export async function GET() {
  try {
    const agents = await db.select().from(agentProfilesInMemory)
      .orderBy(asc(agentProfilesInMemory.agentId))

    const enrichedAgents = await Promise.all(agents.map(async (agent) => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [activeStepResult, lastActiveResult, todayTotalResult, todayCompletedResult] = await Promise.all([
        pool.query(`SELECT * FROM ops.steps WHERE agent_id = $1 AND status = 'running' LIMIT 1`, [agent.agentId]),
        pool.query(`SELECT * FROM ops.agent_events WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`, [agent.agentId]),
        pool.query(`SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1 AND created_at >= $2`, [agent.agentId, todayStart]),
        pool.query(`SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1 AND created_at >= $2 AND event_type IN ('task_complete', 'step_complete', 'phase_complete', 'run_completed')`, [agent.agentId, todayStart]),
      ])

      return {
        ...agent,
        id: agent.agentId,
        status: activeStepResult.rows[0] ? "running" : "idle",
        last_active: lastActiveResult.rows[0]?.created_at || agent.updatedAt,
        today_tasks: todayTotalResult.rows[0].count,
        today_completed: todayCompletedResult.rows[0].count,
      }
    }))

    return NextResponse.json(enrichedAgents)
  } catch (error) {
    console.error("Failed to fetch agents", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
