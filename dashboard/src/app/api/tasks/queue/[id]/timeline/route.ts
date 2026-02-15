export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { agentEventsInOps, taskEventsInOps } from "@/lib/schema"
import { eq, asc, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  // Fetch from both task_events (lifecycle) and agent_events (legacy)
  const [taskEvents, agentEvents] = await Promise.all([
    db.select({
      eventType: taskEventsInOps.eventType,
      agentId: taskEventsInOps.agentId,
      detail: sql`jsonb_build_object(
        'from_status', ${taskEventsInOps.fromStatus},
        'to_status', ${taskEventsInOps.toStatus},
        'actor', ${taskEventsInOps.actor}
      ) || COALESCE(${taskEventsInOps.detail}, '{}')`.as('detail'),
      createdAt: taskEventsInOps.createdAt,
      source: sql<string>`'task_events'`.as('source'),
    })
      .from(taskEventsInOps)
      .where(eq(taskEventsInOps.taskId, BigInt(numId)))
      .orderBy(asc(taskEventsInOps.createdAt)),

    db.select({
      eventType: agentEventsInOps.eventType,
      agentId: agentEventsInOps.agentId,
      detail: agentEventsInOps.detail,
      createdAt: agentEventsInOps.createdAt,
      source: sql<string>`'agent_events'`.as('source'),
    })
      .from(agentEventsInOps)
      .where(eq(agentEventsInOps.taskId, numId))
      .orderBy(asc(agentEventsInOps.createdAt)),
  ])

  // Merge and sort chronologically
  const all = [...taskEvents, ...agentEvents].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  )

  return NextResponse.json(all)
}
