export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { parseNumericId } from "@/lib/validate"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
    const [id, idErr] = parseNumericId(rawId)
    if (idErr) return idErr;

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    const taskDetailsResult = await pool.query(`
      SELECT
        r.id,
        r.title,
        r.status,
        a.name as "assignedAgent",
        r.project,
        r.created_at as "createdAt",
        EXTRACT(EPOCH FROM (r.completed_at - r.created_at)) * 1000 as "durationMs",
        r.tokens as "tokenUsage",
        r.cost as "actualCost",
        r.model
      FROM
        ops.runs r
      LEFT JOIN
        memory.agent_profiles a ON r.agent_id = a.agent_id
      WHERE
        r.id = $1;
    `, [id]);

    if (taskDetailsResult.rowCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const timelineEventsResult = await pool.query(`
        SELECT
            'status_change' as type,
            created_at as timestamp,
            event_type as status
        FROM
            ops.agent_events
        WHERE
            run_id = $1
        ORDER BY
            created_at ASC;
    `, [id]);

    const task = taskDetailsResult.rows[0];
    task.id = task.id.toString();
    task.timeline = timelineEventsResult.rows;

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to fetch task details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
