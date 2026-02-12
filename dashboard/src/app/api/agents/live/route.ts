export const dynamic = "force-dynamic"
import prisma from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/agents/live - returns current status for all agents
export async function GET() {
    try {
        const agents = await prisma.agent_profiles.findMany({
            orderBy: { name: 'asc' },
        })

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

        const liveStatuses = await Promise.all(
            agents.map(async (agent) => {
                // Find the most recent task_start event (within 1h to avoid stale "active")
                const lastTaskStart = await prisma.agent_events.findFirst({
                    where: {
                        agent_id: agent.agent_id,
                        event_type: 'task_start',
                        created_at: { gte: oneHourAgo },
                    },
                    orderBy: { created_at: 'desc' },
                })

                let status: "active" | "idle" | "error" = "idle"
                let current_task: string | null = null

                if (lastTaskStart) {
                    const taskEnd = await prisma.agent_events.findFirst({
                        where: {
                            agent_id: agent.agent_id,
                            event_type: { in: ['task_complete', 'task_fail', 'error'] },
                            created_at: { gte: lastTaskStart.created_at! },
                        },
                    })

                    if (!taskEnd) {
                        status = "active"
                        // @ts-ignore
                        current_task = lastTaskStart.detail?.task || "Working..."
                    }
                }

                // Show last completed task if idle
                if (status === "idle") {
                    const lastComplete = await prisma.agent_events.findFirst({
                        where: { agent_id: agent.agent_id, event_type: 'task_complete' },
                        orderBy: { created_at: 'desc' },
                    })
                    if (lastComplete) {
                        // @ts-ignore
                        current_task = `Last: ${lastComplete.detail?.task || "task"}`
                    }
                }

                // Get last seen from any event
                const lastEvent = await prisma.agent_events.findFirst({
                    where: { agent_id: agent.agent_id },
                    orderBy: { created_at: 'desc' },
                })
                
                return {
                    agent_id: agent.agent_id,
                    name: agent.name,
                    status,
                    current_task,
                    last_seen: lastEvent?.created_at?.toISOString() || null,
                }
            })
        )

        return NextResponse.json(liveStatuses)
    } catch (error: any) {
        console.error("Failed to fetch live agent status", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
