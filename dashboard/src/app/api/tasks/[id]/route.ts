import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    // Note: The spec mentions tables that might not exist yet (e.g. ops.agent_signals).
    // The query will be adapted once the database schema is confirmed.
    // For now, we'll build a query that joins runs, agent_events and other existing tables.

    const taskDetails: any[] = await prisma.$queryRaw`
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
        ops.agents a ON r.agent_id = a.id
      WHERE
        r.id = ${id}::uuid;
    `;

    if (!taskDetails || taskDetails.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const timelineEvents = await prisma.$queryRaw`
        SELECT
            'status_change' as type,
            created_at as timestamp,
            event_type as status
        FROM
            ops.agent_events
        WHERE
            run_id = ${id}::uuid
        ORDER BY
            created_at ASC;
    `;

    const task = taskDetails[0];
    task.timeline = timelineEvents;

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to fetch task details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
