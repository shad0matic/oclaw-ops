export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const zombiesResult = await pool.query(`
      WITH last_event AS (
          SELECT
              session_id,
              MAX(created_at) AS last_event_time
          FROM ops.agent_events
          WHERE event_type <> 'heartbeat'
          GROUP BY session_id
      ),
      last_heartbeat AS (
          SELECT
              session_id,
              MAX(created_at) AS last_heartbeat_time
          FROM ops.agent_events
          WHERE event_type = 'heartbeat'
          GROUP BY session_id
      )
      SELECT
          le.session_id AS "sessionId",
          a.id as "agentId",
          a.name as "agentName",
          'suspected' as "status",
          lh.last_heartbeat_time as "detectedAt",
          'no_activity' AS "heuristic",
          json_build_object('last_event_time', le.last_event_time, 'last_heartbeat_time', lh.last_heartbeat_time) AS "details"
      FROM last_event le
      JOIN last_heartbeat lh ON le.session_id = lh.session_id
      JOIN ops.runs r ON r.session_key = le.session_id
      JOIN memory.agent_profiles a ON r.agent_id = a.agent_id
      WHERE lh.last_heartbeat_time > le.last_event_time + INTERVAL '5 minutes'
      AND r.ended_at IS NULL;
    `);
    const zombies = zombiesResult.rows;

    return NextResponse.json({ zombies });
  } catch (error) {
    console.error('Error fetching zombie agents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
