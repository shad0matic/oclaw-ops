
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { exec } from 'child_process';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { reason } = await request.json();

  try {
    // End the run
    await prisma.$executeRawUnsafe(`
      UPDATE ops.runs
      SET ended_at = NOW(), status = 'failed', zombie_status = 'killed'
      WHERE session_key = '${sessionId}';
    `);

    // Log the kill event
    await prisma.$executeRawUnsafe(`
      INSERT INTO ops.agent_events (session_id, event_type, details)
      VALUES ('${sessionId}', 'zombie_kill', jsonb_build_object('reason', '${reason}'));
    `);

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
