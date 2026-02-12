export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {
  try {
    // Active worktree assignments
    const { rows: tasks } = await pool.query(`
      SELECT id, agent_id, repo, branch, description, file_manifest, status,
             worktree_path,
             EXTRACT(EPOCH FROM (now() - started_at))::int as elapsed,
             started_at, completed_at
      FROM ops.task_assignments
      WHERE status IN ('assigned', 'in_progress', 'review', 'merging')
      ORDER BY started_at DESC
    `)

    // Active file claims (legacy system, still used)
    const { rows: claims } = await pool.query(`
      SELECT agent_id, file_path, description, claimed_at
      FROM ops.file_claims
      WHERE released_at IS NULL
      ORDER BY claimed_at DESC
    `)

    // Recently merged (last 24h)
    const { rows: recent } = await pool.query(`
      SELECT id, agent_id, repo, branch, description, status, completed_at
      FROM ops.task_assignments
      WHERE status IN ('merged', 'failed', 'cancelled')
        AND completed_at > now() - interval '24 hours'
      ORDER BY completed_at DESC
      LIMIT 10
    `)

    return NextResponse.json({
      ok: true,
      active: tasks.map((t: any) => ({ ...t, id: Number(t.id) })),
      claims,
      recent: recent.map((r: any) => ({ ...r, id: Number(r.id) })),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
