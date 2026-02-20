export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/drizzle';
import { parseNumericId } from "@/lib/validate"

interface DependencyTask {
  id: number;
  title: string;
  status: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseNumericId(rawId)
  if (idErr) return idErr;

  try {
    // Upstream: ancestors via parent_id chain using recursive CTE
    const upstreamResult = await pool.query<DependencyTask>(`
      WITH RECURSIVE ancestors AS (
        SELECT id, title, status, parent_id, 1 as depth
        FROM ops.task_queue WHERE id = $1
        UNION ALL
        SELECT t.id, t.title, t.status, t.parent_id, a.depth + 1
        FROM ops.task_queue t
        JOIN ancestors a ON t.id = a.parent_id
      )
      SELECT id, title, status FROM ancestors 
      WHERE id != $1 
      ORDER BY depth;
    `, [id]);

    // Downstream: direct children where parent_id = this task
    const downstreamResult = await pool.query<DependencyTask>(`
      SELECT id, title, status 
      FROM ops.task_queue 
      WHERE parent_id = $1
      ORDER BY priority, created_at;
    `, [id]);

    return NextResponse.json({
      upstream: upstreamResult.rows,
      downstream: downstreamResult.rows,
    });
  } catch (error) {
    console.error('Failed to fetch task dependencies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
