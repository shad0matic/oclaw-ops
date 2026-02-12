import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import si from "systeminformation"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { AgentStrip } from "@/components/dashboard/agent-strip"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { CostCard } from "@/components/dashboard/cost-card"
import { ActiveTasks } from "@/components/dashboard/active-tasks"
import { MemoryIntegrity } from "@/components/dashboard/memory-integrity"
import { AgentLiveStatus } from "@/components/dashboard/agent-live-status"
// import { WorktreeStatus } from "@/components/dashboard/worktree-status" // hidden for now

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // System Stats (can fail in some envs)
  let cpuLoad = 0
  let memStats = { active: 0, total: 0 }
  let uptime = 0
  try {
    const [load, mem, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.time()
    ])
    cpuLoad = load.currentLoad
    memStats = mem
    uptime = time.uptime
  } catch (e) {
    console.error("Failed to get system stats", e)
  }

  // DB Fetch
  const [agents, events, completedTasks] = await Promise.all([
    prisma.agent_profiles.findMany({ orderBy: { agent_id: 'asc' } }),
    prisma.agent_events.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.runs.count({
      where: {
        status: 'completed',
        completed_at: { gte: today }
      }
    }),
  ])

  // Enrich agents with live status (1h staleness cutoff)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
    const lastTaskStart = await prisma.agent_events.findFirst({
        where: { agent_id: agent.agent_id, event_type: 'task_start', created_at: { gte: oneHourAgo } },
        orderBy: { created_at: 'desc' },
    });

    let status: "active" | "idle" = "idle";
    let current_task: string | null = null;

    if (lastTaskStart) {
        const taskEnd = await prisma.agent_events.findFirst({
            where: {
                agent_id: agent.agent_id,
                event_type: { in: ['task_complete', 'task_fail', 'error'] },
                created_at: { gte: lastTaskStart.created_at! },
            },
        });
        if (!taskEnd) {
            status = "active";
            // @ts-ignore
            current_task = lastTaskStart.detail?.task || lastTaskStart.detail?.description || null;
        }
    }
    
    return {
      agent_id: agent.agent_id,
      name: agent.name,
      level: agent.level || 1,
      trust_score: Number(agent.trust_score) || 0.5,
      status,
      current_task,
    }
  }))

  const kpiData = {
    kevinStatus: {
      status: uptime > 0 ? "online" as const : "offline" as const,
      uptime: uptime
    },
    serverLoad: {
      cpu: cpuLoad,
      memory: memStats.active
    },
    completedTasks
  }

  // Serialize BigInt for events
  const serializedEvents = events.map((e: any) => ({
    ...e,
    id: Number(e.id),
    context_id: e.context_id ? Number(e.context_id) : null,
    created_at: e.created_at?.toISOString() || new Date().toISOString(),
    cost_usd: Number(e.cost_usd),
  }))

  return (
    <div className="space-y-8">
      <DataRefresh />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>{process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Minions Control"}</h2><p className="text-sm text-zinc-500 mb-4">{process.env.NEXT_PUBLIC_DASHBOARD_SUBTITLE || "Your agent workforce at a glance — KPIs, activity, costs, and system health."}</p></div>
      </div>

      <KPICards {...kpiData} />

      <CostCard />

      <div className="grid gap-4 md:grid-cols-2">
        <ActiveTasks />
        <MemoryIntegrity />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-400">Active Agents</h3>
        <AgentStrip agents={enrichedAgents} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
            <ActivityFeed events={serializedEvents} />
        </div>
        <div className="col-span-4">
            <AgentLiveStatus />
        </div>
      </div>
    </div>
  )
}
