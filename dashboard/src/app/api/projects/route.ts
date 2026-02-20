import { db } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const rows = await db.execute(sql`
      SELECT
        p.*,
        COALESCE(SUM(CASE WHEN t.status IN ('queued','planned','assigned','backlog') THEN 1 ELSE 0 END), 0)::int AS "tasksOpen",
        COALESCE(SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END), 0)::int AS "tasksRunning",
        COALESCE(SUM(CASE WHEN t.status IN ('done','review') THEN 1 ELSE 0 END), 0)::int AS "tasksDone",
        MAX(GREATEST(t.started_at, t.completed_at)) AS "lastActivity"
      FROM ops.projects p
      LEFT JOIN ops.task_queue t ON t.project = p.id
      GROUP BY p.id
      ORDER BY p.label
    `)

    return NextResponse.json(rows.rows)
  } catch (error: any) {
    console.error("Failed to fetch projects with task stats", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
