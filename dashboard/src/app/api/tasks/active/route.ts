import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/tasks/active — returns currently running agent tasks with heartbeat status
export async function GET() {
    const { rows } = await pool.query(`
        SELECT r.id, r.agent_id, r.task, r.status, r.heartbeat_msg, r.timeout_seconds,
               r.started_at, r.last_heartbeat, r.session_key,
               EXTRACT(EPOCH FROM (now() - r.started_at))::int as elapsed_seconds,
               EXTRACT(EPOCH FROM (now() - COALESCE(r.last_heartbeat, r.started_at)))::int as since_heartbeat,
               p.name as agent_name,
               e.detail->>'model' as model
        FROM ops.runs r
        LEFT JOIN memory.agent_profiles p ON p.agent_id = r.agent_id
        LEFT JOIN ops.agent_events e ON e.context_id = r.id AND e.event_type = 'task_start'
        WHERE r.status IN ('running', 'stalled')
        ORDER BY r.started_at DESC
    `)

    // Also get recently completed/failed (last 30 min) for context
    const { rows: recent } = await pool.query(`
        SELECT r.id, r.agent_id, r.task, r.status, r.heartbeat_msg,
               r.started_at, r.completed_at,
               EXTRACT(EPOCH FROM (r.completed_at - r.started_at))::int as duration_seconds,
               p.name as agent_name,
               e.detail->>'model' as model
        FROM ops.runs r
        LEFT JOIN memory.agent_profiles p ON p.agent_id = r.agent_id
        LEFT JOIN ops.agent_events e ON e.context_id = r.id AND e.event_type = 'task_start'
        WHERE r.status IN ('completed', 'failed', 'stalled')
          AND r.completed_at > now() - interval '30 minutes'
        ORDER BY r.completed_at DESC
        LIMIT 10
    `)

    const active = rows.map((r: any) => ({
        id: Number(r.id),
        agentId: r.agent_id,
        agentName: r.agent_name || r.agent_id,
        task: r.task,
        status: r.status,
        heartbeatMsg: r.heartbeat_msg,
        elapsedSeconds: r.elapsed_seconds,
        sinceHeartbeat: r.since_heartbeat,
        timeoutSeconds: r.timeout_seconds,
        isStalled: r.since_heartbeat > r.timeout_seconds,
        startedAt: r.started_at,
        model: r.model,
    }))

    const recentTasks = recent.map((r: any) => ({
        id: Number(r.id),
        agentId: r.agent_id,
        agentName: r.agent_name || r.agent_id,
        task: r.task,
        status: r.status,
        heartbeatMsg: r.heartbeat_msg,
        durationSeconds: r.duration_seconds,
        completedAt: r.completed_at,
        model: r.model,
    }))

    return NextResponse.json({ active, recent: recentTasks })
}
