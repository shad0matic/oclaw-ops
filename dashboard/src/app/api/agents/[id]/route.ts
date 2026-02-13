export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { db, pool } from "@/lib/drizzle"
import { agentProfilesInMemory } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import { parseStringId } from "@/lib/validate"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseStringId(rawId)
  if (idErr) return idErr

  try {
    const [agent] = await db.select().from(agentProfilesInMemory)
      .where(eq(agentProfilesInMemory.agentId, id!))

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

    // Enrich with additional stats (complex queries stay raw)
    const [activeStepResult, lastActiveResult, totalEventsResult, reviewsResult] = await Promise.all([
      pool.query(`SELECT * FROM ops.steps WHERE agent_id = $1 AND status = 'running' LIMIT 1`, [id]),
      pool.query(`SELECT * FROM ops.agent_events WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]),
      pool.query(`SELECT COUNT(*)::int as count FROM ops.agent_events WHERE agent_id = $1`, [id]),
      pool.query(`SELECT * FROM memory.performance_reviews WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
    ])

    return NextResponse.json({
      ...agent,
      status: activeStepResult.rows[0] ? "running" : "idle",
      last_active: lastActiveResult.rows[0]?.created_at || agent.updatedAt,
      total_events: totalEventsResult.rows[0].count,
      reviews: reviewsResult.rows,
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
  const { id: rawId } = await params
  const [id, idErr] = parseStringId(rawId)
  if (idErr) return idErr
  const body = await req.json()

  const values: Partial<typeof agentProfilesInMemory.$inferInsert> = {}
  if (body.description !== undefined) values.description = body.description
  if (body.name !== undefined) values.name = body.name

  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  try {
    const [updated] = await db.update(agentProfilesInMemory)
      .set({ ...values, updatedAt: sql`NOW()` })
      .where(eq(agentProfilesInMemory.agentId, id!))
      .returning()
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update agent", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
