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
import { WorktreeStatus } from "@/components/dashboard/worktree-status"

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
  const [agents, events, activeRuns, completedTasks, tokenStats] = await Promise.all([
    prisma.agent_profiles.findMany({ orderBy: { agent_id: 'asc' } }),
    prisma.agent_events.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.runs.count({ where: { status: 'running' } }),
    prisma.runs.count({
      where: {
        status: 'completed',
        completed_at: { gte: today }
      }
    }),
    prisma.agent_events.aggregate({
      _sum: { tokens_used: true, cost_usd: true },
      where: { created_at: { gte: today } }
    }),
  ])

  // Enrich agents
  const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
    // Check for active steps
    const activeStep = await prisma.steps.findFirst({
      where: {
        agent_id: agent.agent_id,
        status: "running"
      }
    })

    return {
      agent_id: agent.agent_id,
      name: agent.name,
      level: agent.level || 1,
      trust_score: Number(agent.trust_score) || 0.5,
      status: activeStep ? "running" : "idle", // TODO: Error state
    }
  }))

  const kpiData = {
    kevinStatus: {
      status: uptime > 0 ? "online" as const : "offline" as const, // casting for TS
      uptime: uptime
    },
    tokenUsage: {
      today: tokenStats._sum.tokens_used || 0,
      cost: Number(tokenStats._sum.cost_usd) || 0
    },
    serverLoad: {
      cpu: cpuLoad,
      memory: memStats.active
    },
    activeRuns,
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
        <div><h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>Minions Control</h2><p className="text-sm text-zinc-500 mb-4">Your agent workforce at a glance — KPIs, activity, costs, and system health.</p></div>
      </div>

      <KPICards {...kpiData} />

      <CostCard />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ActiveTasks />
        <WorktreeStatus />
        <MemoryIntegrity />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-400">Active Agents</h3>
        <AgentStrip agents={enrichedAgents} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2">
          <ActivityFeed events={serializedEvents} />
        </div>
        {/* Future: Workflow list or other widgets */}
      </div>
    </div>
  )
}
