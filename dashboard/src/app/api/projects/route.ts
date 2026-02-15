
import { db } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { projectsInOps, taskQueueInOps } from "@/lib/schema"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const projectTaskStats = db
      .select({
        projectId: taskQueueInOps.epic,
        status: taskQueueInOps.status,
        count: sql<number>`count(*)::int`,
      })
      .from(taskQueueInOps)
      .where(sql`${taskQueueInOps.epic} IS NOT NULL`)
      .groupBy(taskQueueInOps.epic, taskQueueInOps.status)
      .as("task_stats")

    const projectsWithStats = await db
      .select({
        ...projectsInOps,
        tasksOpen: sql<number>`SUM(CASE WHEN ${projectTaskStats.status} = 'queued' THEN ${projectTaskStats.count} ELSE 0 END)::int`,
        tasksRunning: sql<number>`SUM(CASE WHEN ${projectTaskStats.status} = 'running' THEN ${projectTaskStats.count} ELSE 0 END)::int`,
        tasksDone: sql<number>`SUM(CASE WHEN ${projectTaskStats.status} = 'done' THEN ${projectTaskStats.count} ELSE 0 END)::int`,
      })
      .from(projectsInOps)
      .leftJoin(projectTaskStats, sql`${projectsInOps.id} = ${projectTaskStats.projectId}`)
      .groupBy(projectsInOps.id)
      .orderBy(projectsInOps.label)

    return NextResponse.json(projectsWithStats)
  } catch (error: any) {
    console.error("Failed to fetch projects with task stats", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
