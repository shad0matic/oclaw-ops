export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/drizzle';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    // Update the agent's session status to 'none'
    await pool.query(`
      UPDATE ops.runs
      SET zombie_status = 'pardoned'
      WHERE session_key = $1;
    `, [sessionId]);

    // Log the pardon event
    await pool.query(`
      INSERT INTO ops.agent_events (session_id, event_type, details)
      VALUES ($1, 'zombie_pardon', jsonb_build_object('reason', 'manual_pardon'));
    `, [sessionId]);

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} has been pardoned.`,
    });
  } catch (error) {
    console.error(`Error pardoning zombie agent for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
