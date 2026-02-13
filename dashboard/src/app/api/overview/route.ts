export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"
import si from "systeminformation"

interface TaskTree {
  id: number
  agentId: string
  agentName: string
  task: string
  model: string | null
  startedAt: string
  elapsedSeconds: number
  heartbeatAge: number
  heartbeatMsg: string | null
  cost: number
  spawnedBy: string | null
  children: TaskTree[]
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // System stats
    let cpuLoad = 0, memStats = { active: 0, total: 0 }, uptime = 0
    try {
      const [load, mem, time] = await Promise.all([
        si.currentLoad(), si.mem(), si.time()
      ])
      cpuLoad = load.currentLoad
      memStats = mem
      uptime = time.uptime
    } catch {}

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Parallel DB queries
    const [
      { rows: agents },
      { rows: runningRuns },
      { rows: pipelineRaw },
      { rows: recentEvents },
      { rows: dailyCostRows },
      { rows: zombieEvents },
      { rows: suspectedZombies },
    ] = await Promise.all([
      // All agents with profiles
      pool.query("SELECT * FROM memory.agent_profiles ORDER BY agent_id ASC"),

      // Currently running tasks
      pool.query("SELECT * FROM ops.runs WHERE status = 'running' ORDER BY started_at DESC"),

      // Pipeline stats (last 24h)
      pool.query(`
        SELECT event_type, COUNT(*)::int as count
        FROM ops.agent_events
        WHERE event_type IN ('task_start', 'task_complete', 'task_fail')
          AND created_at >= $1
        GROUP BY event_type
      `, [last24h]),

      // Recent events (last 50)
      pool.query('SELECT * FROM ops.agent_events WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 50', [last24h]),

      // Today's cost
      pool.query('SELECT SUM(cost_usd) as cost_usd FROM ops.agent_events WHERE created_at >= $1 AND cost_usd IS NOT NULL', [todayStart]),

      // Recent zombie kills (last 15 min for avatar overlay)
      pool.query(`
        SELECT * FROM ops.agent_events
        WHERE event_type = 'zombie_killed'
          AND created_at >= $1
      `, [new Date(now.getTime() - 15 * 60 * 1000)]),
      
      // Suspected Zombies
      pool.query(`
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
      `)
    ])
    
    const dailyCost = dailyCostRows[0]?.cost_usd || 0

    // Build task trees from running runs
    const nowMs = now.getTime()
    const flatTasks: TaskTree[] = runningRuns.map((run: any) => ({
      id: Number(run.id),
      agentId: run.agent_id,
      agentName: agents.find((a: any) => a.agent_id === run.agent_id)?.name || run.agent_id,
      task: run.task || 'Unknown task',
      model: run.triggered_by || null,
      startedAt: run.started_at?.toISOString() || now.toISOString(),
      elapsedSeconds: run.started_at ? Math.round((nowMs - new Date(run.started_at).getTime()) / 1000) : 0,
      heartbeatAge: run.last_heartbeat ? Math.round((nowMs - new Date(run.last_heartbeat).getTime()) / 1000) : 0,
      heartbeatMsg: run.heartbeat_msg || null,
      cost: 0,
      spawnedBy: null,
      children: []
    }))

    // Enrich with spawn relationships from agent_events
    const { rows: recentStarts } = await pool.query(`
      SELECT * FROM ops.agent_events
      WHERE event_type = 'task_start'
        AND created_at >= $1
      ORDER BY created_at DESC
    `, [oneHourAgo])

    for (const task of flatTasks) {
      const startEvent = recentStarts.find((e: any) =>
        e.agent_id === task.agentId &&
        (e.detail as any)?.run_id === task.id
      )
      if (startEvent) {
        const detail = startEvent.detail as any
        task.spawnedBy = detail?.spawned_by || null
        task.model = detail?.model || task.model
      }
    }

    // Build trees: nest children under parents
    const taskTrees: TaskTree[] = []
    const byAgent = new Map<string, TaskTree[]>()
    for (const t of flatTasks) {
      const arr = byAgent.get(t.agentId) || []
      arr.push(t)
      byAgent.set(t.agentId, arr)
    }

    // Group spawned tasks under their spawner
    const claimed = new Set<number>()
    for (const task of flatTasks) {
      if (task.spawnedBy) {
        const parentTasks = byAgent.get(task.spawnedBy) || flatTasks.filter(t => t.agentId === task.spawnedBy)
        const parent = parentTasks[0]
        if (parent && parent.id !== task.id) {
          parent.children.push(task)
          claimed.add(task.id)
        }
      }
    }
    // Top-level = not claimed as children
    for (const task of flatTasks) {
      if (!claimed.has(task.id)) {
        taskTrees.push(task)
      }
    }

    // Enrich agents with live status
    const zombieAgentIds = new Set(zombieEvents.map((e: any) => (e.detail as any)?.agent_id || e.agent_id))

    const enrichedAgents = agents.map((agent: any) => {
      const agentRuns = runningRuns.filter((r: any) => r.agent_id === agent.agent_id)
      const hasRunning = agentRuns.length > 0

      // Check for recent task_start without completion
      const lastStart = recentStarts.find((e: any) => e.agent_id === agent.agent_id)
      let status: 'active' | 'idle' | 'error' | 'zombie' = 'idle'
      let currentTask: string | null = null

      if (zombieAgentIds.has(agent.agent_id)) {
        status = 'zombie'
      } else if (hasRunning) {
        status = 'active'
        currentTask = agentRuns[0]?.task || null
      } else if (lastStart) {
        // Check if there's a completion after the start
        const hasCompletion = recentEvents.some((e: any) =>
          e.agent_id === agent.agent_id &&
          ['task_complete', 'task_fail'].includes(e.event_type) &&
          e.created_at && lastStart.created_at &&
          new Date(e.created_at) >= new Date(lastStart.created_at)
        )
        if (!hasCompletion) {
          status = 'active'
          currentTask = (lastStart.detail as any)?.task || null
        }
      }

      return {
        id: agent.agent_id,
        name: agent.name,
        description: agent.description || '',
        level: agent.level || 1,
        trustScore: Number(agent.trust_score) || 0.5,
        totalTasks: agent.total_tasks || 0,
        successfulTasks: agent.successful_tasks || 0,
        status,
        currentTask,
        recentZombieKill: zombieAgentIds.has(agent.agent_id)
      }
    })

    // Pipeline stats
    const pipelineMap = Object.fromEntries(pipelineRaw.map((p: any) => [p.event_type, p.count]))
    const completed = pipelineMap['task_complete'] || 0
    const failed = pipelineMap['task_fail'] || 0
    const started = pipelineMap['task_start'] || 0
    const running = runningRuns.length
    const queued = Math.max(0, started - completed - failed - running)

    const pipeline = {
      queued,
      running,
      completed,
      failed,
      successRate: (completed + failed) > 0 ? Math.round((completed / (completed + failed)) * 100) : 100
    }

    // Serialize events
    const serializedEvents = recentEvents.slice(0, 30).map((e: any) => ({
      id: Number(e.id),
      agentId: e.agent_id,
      agentName: agents.find((a: any) => a.agent_id === e.agent_id)?.name || e.agent_id,
      eventType: e.event_type,
      detail: e.detail,
      costUsd: Number(e.cost_usd) || 0,
      tokensUsed: e.tokens_used || 0,
      createdAt: e.created_at?.toISOString() || now.toISOString()
    }))

    return NextResponse.json({
      system: {
        status: uptime > 0 ? 'online' : 'offline',
        uptime,
        cpu: Math.round(cpuLoad * 10) / 10,
        memory: Math.round((memStats.active / memStats.total) * 100)
      },
      liveWork: {
        count: taskTrees.reduce((sum, t) => sum + 1 + t.children.length, 0),
        tasks: taskTrees
      },
      team: enrichedAgents,
      pipeline,
      dailyCost: Number(dailyCost) || 0,
      recentEvents: serializedEvents,
      zombies: suspectedZombies
    })
  } catch (error) {
    console.error("Overview API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
