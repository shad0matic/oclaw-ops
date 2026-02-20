import { db } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"
import { agentEventsInOps } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const lastInspection = await db
      .select({ createdAt: agentEventsInOps.createdAt })
      .from(agentEventsInOps)
      .where(and(
        eq(agentEventsInOps.agentId, 'mel'),
        eq(agentEventsInOps.eventType, 'zombie_check')
      ))
      .orderBy(sql`${agentEventsInOps.createdAt} DESC`)
      .limit(1)

    const lastKill = await db
      .select({ createdAt: agentEventsInOps.createdAt })
      .from(agentEventsInOps)
      .where(and(
        eq(agentEventsInOps.agentId, 'mel'),
        eq(agentEventsInOps.eventType, 'task_kill')
      ))
      .orderBy(sql`${agentEventsInOps.createdAt} DESC`)
      .limit(1)

    return NextResponse.json({
      lastInspection: lastInspection[0]?.createdAt || null,
      lastKill: lastKill[0]?.createdAt || null,
    })
  } catch (error: any) {
    console.error("Failed to fetch Mel's status", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
