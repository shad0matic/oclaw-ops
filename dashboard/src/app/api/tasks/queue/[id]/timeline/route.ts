export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { agentEventsInOps } from "@/lib/schema"
import { eq, asc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const rows = await db.select({
    eventType: agentEventsInOps.eventType,
    agentId: agentEventsInOps.agentId,
    detail: agentEventsInOps.detail,
    createdAt: agentEventsInOps.createdAt,
  })
    .from(agentEventsInOps)
    .where(eq(agentEventsInOps.taskId, numId))
    .orderBy(asc(agentEventsInOps.createdAt))

  return NextResponse.json(rows)
}
