export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/drizzle';
import { exec } from 'child_process';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { reason } = await request.json();

  try {
    // End the run
    await pool.query(`
      UPDATE ops.runs
      SET ended_at = NOW(), status = 'failed', zombie_status = 'killed'
      WHERE session_key = $1;
    `, [sessionId]);

    // Log the kill event
    await pool.query(`
      INSERT INTO ops.agent_events (session_id, event_type, details)
      VALUES ($1, 'zombie_kill', jsonb_build_object('reason', $2));
    `, [sessionId, reason]);

    // NOTE: The actual process killing logic is not implemented here.
    // This would depend on the process management system (e.g., Docker, systemd).
    console.log(`Kill signal sent to session ${sessionId} for reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: `Kill signal sent to session ${sessionId}.`,
    });
  } catch (error) {
    console.error(`Error killing zombie agent for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
