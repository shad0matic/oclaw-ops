import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import si from "systeminformation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

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
  const [agents, events] = await Promise.all([
    prisma.agent_profiles.findMany({ orderBy: { agent_id: 'asc' } }),
    prisma.agent_events.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
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

  // Serialize BigInt for events
  const serializedEvents = events.map((e: any) => ({
    ...e,
    id: Number(e.id),
    context_id: e.context_id ? Number(e.context_id) : null,
    created_at: e.created_at?.toISOString() || new Date().toISOString(),
    cost_usd: Number(e.cost_usd),
  }))

  const initialData = {
      enrichedAgents,
      serializedEvents,
      kevinStatus: {
        status: uptime > 0 ? "online" as const : "offline" as const,
        uptime: uptime
      },
      serverLoad: {
        cpu: cpuLoad,
        memory: memStats.active
      }
  }

  return <DashboardClient initialData={initialData} />
}
