export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { agentEventsInOps } from "@/lib/schema"
import { desc, eq } from "drizzle-orm"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "20")
  const agentId = searchParams.get("agent_id")

  try {
    let query = db.select().from(agentEventsInOps).$dynamic()
    if (agentId) {
      query = query.where(eq(agentEventsInOps.agentId, agentId))
    }
    const events = await query.orderBy(desc(agentEventsInOps.createdAt)).limit(limit)
    return NextResponse.json(events.map(e => ({ ...e, id: Number(e.id) })))
  } catch (error) {
    console.error("Failed to fetch events", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
