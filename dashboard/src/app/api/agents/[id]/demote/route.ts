export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { db, pool } from "@/lib/drizzle"
import { agentProfilesInMemory } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import { parseStringId } from "@/lib/validate"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseStringId(rawId)
  if (idErr) return idErr

  try {
    const body = await req.json()
    const { feedback } = body

    const [agent] = await db.select().from(agentProfilesInMemory)
      .where(eq(agentProfilesInMemory.agentId, id!))

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

    const currentLevel = agent.level || 1
    if (currentLevel <= 1) {
      return NextResponse.json({ error: "Agent is already at minimum level (1)" }, { status: 400 })
    }

    const newLevel = currentLevel - 1

    const [updated] = await db.update(agentProfilesInMemory)
      .set({ level: newLevel, updatedAt: sql`NOW()` })
      .where(eq(agentProfilesInMemory.agentId, id!))
      .returning()

    await pool.query(`
      INSERT INTO memory.performance_reviews (agent_id, reviewer, rating, level_before, level_after, feedback, output_summary)
      VALUES ($1, $2, 2, $3, $4, $5, 'Level demotion')
    `, [id, "boss", currentLevel, newLevel, feedback || `Demoted from level ${currentLevel} to ${newLevel}`])

    return NextResponse.json({
      agent: updated,
      review: { feedback: feedback || `Demoted from level ${currentLevel} to ${newLevel}` },
    })
  } catch (error) {
    console.error("Failed to demote agent", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
