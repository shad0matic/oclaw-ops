export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { taskQueueInOps, agentProfilesInMemory } from "@/lib/schema"
import { eq, and, desc, sql, ilike, SQL, inArray } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const page = Math.max(1, Number(params.get("page") || 1))
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 30)))
  const offset = (page - 1) * limit
  const search = params.get("search") || ""
  const project = params.get("project") || ""

  const conditions: SQL[] = [
    inArray(taskQueueInOps.status, ["done", "failed", "cancelled"]),
  ]
  if (project) conditions.push(eq(taskQueueInOps.project, project))
  if (search) conditions.push(ilike(taskQueueInOps.title, `%${search}%`))

  const where = and(...conditions)

  const [rows, countRows] = await Promise.all([
    db.select({
      task: taskQueueInOps,
      agentName: agentProfilesInMemory.name,
    })
      .from(taskQueueInOps)
      .leftJoin(agentProfilesInMemory, eq(agentProfilesInMemory.agentId, taskQueueInOps.agentId))
      .where(where)
      .orderBy(desc(taskQueueInOps.completedAt), desc(taskQueueInOps.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: sql<number>`count(*)::int` })
      .from(taskQueueInOps)
      .where(where),
  ])

  const tasks = rows.map(({ task, agentName }) => ({
    id: Number(task.id),
    title: task.title,
    description: task.description,
    project: task.project,
    agent_id: task.agentId,
    agent_name: agentName,
    status: task.status,
    priority: Number(task.priority),
    completed_at: task.completedAt,
    created_at: task.createdAt,
  }))

  return NextResponse.json({ tasks, total: countRows[0]?.count || 0 })
}
