export const dynamic = "force-dynamic"
import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// GET /api/tasks/epics — returns epic progress summaries
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        epic,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'done')::int as done,
        COUNT(*) FILTER (WHERE status = 'running')::int as running,
        COUNT(*) FILTER (WHERE status IN ('queued', 'planned', 'assigned'))::int as pending,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed
      FROM ops.task_queue
      WHERE epic IS NOT NULL
      GROUP BY epic
      ORDER BY epic
    `)

    const epics = rows.map((r: any) => ({
      name: r.epic,
      total: r.total,
      done: r.done,
      running: r.running,
      pending: r.pending,
      failed: r.failed,
      progress: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
    }))

    return NextResponse.json(epics)
  } catch (error) {
    console.error("Epics error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
