export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"
import { getCpuLoad, getMemStats, getUptime, getDashboardUptime, getLoadAvg, getCoreCount } from "@/lib/system-stats"

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
  source?: 'runs' | 'queue'
}

export async function GET() {
  const t0 = Date.now()
  const tAuth = Date.now()

  try {
    // System stats from /proc (instant, no child processes)
    const cpuLoad = getCpuLoad()
    const memStats = getMemStats()
    const uptime = getUptime()
    const tSi = Date.now()

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Parallel DB queries
    const [
      { rows: agents },
      { rows: runningRuns },
      { rows: runningQueueTasks },
      { rows: pipelineRaw },
      { rows: recentEvents },
      { rows: dailyCostRows },
      { rows: zombieEvents },
      { rows: suspectedZombies },
    ] = await Promise.all([
      // All agents with profiles
      pool.query("SELECT * FROM memory.agent_profiles ORDER BY agent_id ASC"),

      // Currently running tasks (ops.runs)
      pool.query("SELECT * FROM ops.runs WHERE status = 'running' ORDER BY started_at DESC"),

      // Currently running tasks from kanban (ops.task_queue)
      pool.query(`
        SELECT id, title, description, agent_id, status, started_at, project
        FROM ops.task_queue
        WHERE status IN ('running', 'planned', 'assigned')
        ORDER BY started_at DESC NULLS LAST
      `),

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
      
      // Suspected Zombies — simple: running tasks with no heartbeat for 15+ min
      pool.query(`
        SELECT r.id, r.agent_id AS "agentId", a.name AS "agentName",
               r.session_key AS "sessionId", r.last_heartbeat AS "detectedAt"
        FROM ops.runs r
        LEFT JOIN memory.agent_profiles a ON r.agent_id = a.agent_id
        WHERE r.status = 'running'
          AND r.last_heartbeat IS NOT NULL
          AND r.last_heartbeat < NOW() - INTERVAL '15 minutes'
      `)
    ])
    
    const dailyCost = dailyCostRows[0]?.cost_usd || 0

    // Build task trees from running runs + running queue tasks
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
      children: [],
      source: 'runs' as const,
    }))

    // Merge running kanban tasks (avoid duplicates if same task is in both tables)
    const runTaskIds = new Set(flatTasks.map(t => t.task))
    for (const qt of runningQueueTasks) {
      // Skip if already tracked via ops.runs
      if (runTaskIds.has(qt.title)) continue
      flatTasks.push({
        id: Number(qt.id) + 100000, // offset to avoid ID collision with runs
        agentId: qt.agent_id || 'unassigned',
        agentName: agents.find((a: any) => a.agent_id === qt.agent_id)?.name || qt.agent_id || 'Unassigned',
        task: qt.title || 'Unknown task',
        model: null,
        startedAt: qt.started_at?.toISOString() || now.toISOString(),
        elapsedSeconds: qt.started_at ? Math.round((nowMs - new Date(qt.started_at).getTime()) / 1000) : 0,
        heartbeatAge: 0,
        heartbeatMsg: qt.status === 'running' ? null : `Status: ${qt.status}`,
        cost: 0,
        spawnedBy: null,
        children: [],
        source: 'queue' as const,
      })
    }

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

    // Query live sessions from session poller (primary source of truth for activity)
    let liveSessions: any[] = []
    try {
      const { rows } = await pool.query(`
        SELECT agent_id, COUNT(*) FILTER (WHERE is_active)::int as active_count,
               (SELECT label FROM ops.live_sessions ls2 
                WHERE ls2.agent_id = ls.agent_id AND ls2.is_active = true 
                ORDER BY ls2.updated_at DESC LIMIT 1) as current_label,
               (SELECT model FROM ops.live_sessions ls3 
                WHERE ls3.agent_id = ls.agent_id AND ls3.is_active = true 
                ORDER BY ls3.updated_at DESC LIMIT 1) as current_model
        FROM ops.live_sessions ls
        GROUP BY agent_id
      `)
      liveSessions = rows
    } catch { /* table might not exist yet */ }
    const liveByAgent = Object.fromEntries(liveSessions.map((r: any) => [r.agent_id, r]))

    // Enrich agents with live status
    const zombieAgentIds = new Set(zombieEvents.map((e: any) => (e.detail as any)?.agent_id || e.agent_id))

    const enrichedAgents = agents.map((agent: any) => {
      const agentRuns = runningRuns.filter((r: any) => r.agent_id === agent.agent_id)
      const agentQueueTasks = runningQueueTasks.filter((t: any) => t.agent_id === agent.agent_id)
      const hasRunning = agentRuns.length > 0 || agentQueueTasks.some((t: any) => t.status === 'running')
      const hasPlanned = agentQueueTasks.some((t: any) => ['planned', 'assigned'].includes(t.status))
      const liveData = liveByAgent[agent.agent_id]
      const hasActiveSessions = liveData && liveData.active_count > 0

      // Check for recent task_start without completion
      const lastStart = recentStarts.find((e: any) => e.agent_id === agent.agent_id)
      let status: 'active' | 'idle' | 'error' | 'zombie' = 'idle'
      let currentTask: string | null = null

      if (zombieAgentIds.has(agent.agent_id)) {
        status = 'zombie'
      } else if (hasRunning) {
        status = 'active'
        currentTask = agentRuns[0]?.task || agentQueueTasks.find((t: any) => t.status === 'running')?.title || null
      } else if (hasActiveSessions) {
        status = 'active'
        currentTask = liveData.current_label || null
      } else if (hasPlanned) {
        status = 'idle'
        currentTask = `📋 ${agentQueueTasks[0]?.title || 'Planned task'}`
      } else if (lastStart) {
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
        currentModel: liveData?.current_model || null,
        activeSessions: liveData?.active_count || 0,
        runningTasks: agentQueueTasks.filter((t: any) => t.status === 'running').length,
        plannedTasks: agentQueueTasks.filter((t: any) => ['planned', 'assigned'].includes(t.status)).length,
        recentZombieKill: zombieAgentIds.has(agent.agent_id)
      }
    })

    // Pipeline stats — use task_queue as primary source
    const pipelineMap = Object.fromEntries(pipelineRaw.map((p: any) => [p.event_type, p.count]))
    const completed = pipelineMap['task_complete'] || 0
    const failed = pipelineMap['task_fail'] || 0
    const running = runningQueueTasks.filter((t: any) => t.status === 'running').length || runningRuns.length
    const queued = runningQueueTasks.filter((t: any) => ['planned', 'assigned'].includes(t.status)).length

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

    const tEnd = Date.now()
    console.log(`Overview API timing: auth=${tAuth-t0}ms si=${tSi-tAuth}ms queries+logic=${tEnd-tSi}ms total=${tEnd-t0}ms`)

    return NextResponse.json({
      system: {
        status: uptime > 0 ? 'online' : 'offline',
        uptime,
        dashboardUptime: getDashboardUptime(),
        cpu: Math.round(cpuLoad * 10) / 10,
        memory: Math.round((memStats.active / memStats.total) * 100),
        load: getLoadAvg(),
        cores: getCoreCount()
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
