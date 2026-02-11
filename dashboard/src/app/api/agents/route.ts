import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const agents = await prisma.agent_profiles.findMany({
            orderBy: { agent_id: 'asc' }
        })

        // Enrich with status
        // For each agent, check if they have active steps
        const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
            const activeStep = await prisma.steps.findFirst({
                where: {
                    agent_id: agent.agent_id,
                    status: "running"
                }
            })

            const lastActive = await prisma.agent_events.findFirst({
                where: { agent_id: agent.agent_id },
                orderBy: { created_at: 'desc' }
            })

            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const [todayTotal, todayCompleted] = await Promise.all([
                prisma.agent_events.count({
                    where: {
                        agent_id: agent.agent_id,
                        created_at: { gte: todayStart },
                    }
                }),
                prisma.agent_events.count({
                    where: {
                        agent_id: agent.agent_id,
                        created_at: { gte: todayStart },
                        event_type: { in: ['task_complete', 'step_complete', 'phase_complete', 'run_completed'] }
                    }
                }),
            ])

            return {
                ...agent,
                status: activeStep ? "running" : "idle",
                last_active: lastActive?.created_at || agent.updated_at,
                today_tasks: todayTotal,
                today_completed: todayCompleted,
            }
        }))

        return NextResponse.json(enrichedAgents)
    } catch (error) {
        console.error("Failed to fetch agents", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
