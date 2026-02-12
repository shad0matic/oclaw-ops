export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    // Update the agent's session status to 'none'
    await prisma.$executeRawUnsafe(`
      UPDATE ops.runs
      SET zombie_status = 'pardoned'
      WHERE session_key = '${sessionId}';
    `);

    // Log the pardon event
    await prisma.$executeRawUnsafe(`
      INSERT INTO ops.agent_events (session_id, event_type, details)
      VALUES ('${sessionId}', 'zombie_pardon', jsonb_build_object('reason', 'manual_pardon'));
    `);

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} has been pardoned.`,
    });
  } catch (error) {
    console.error(`Error pardoning zombie agent for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
