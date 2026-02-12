export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        const agent = await prisma.agent_profiles.findUnique({
            where: { agent_id: id }
        })

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        // Enrich with additional stats
        const [activeStep, lastActive, totalEvents, reviews] = await Promise.all([
            prisma.steps.findFirst({
                where: {
                    agent_id: id,
                    status: "running"
                }
            }),
            prisma.agent_events.findFirst({
                where: { agent_id: id },
                orderBy: { created_at: 'desc' }
            }),
            prisma.agent_events.count({
                where: { agent_id: id }
            }),
            prisma.performance_reviews.findMany({
                where: { agent_id: id },
                orderBy: { created_at: 'desc' },
                take: 10
            })
        ])

        return NextResponse.json({
            ...agent,
            status: activeStep ? "running" : "idle",
            last_active: lastActive?.created_at || agent.updated_at,
            total_events: totalEvents,
            reviews
        })
    } catch (error) {
        console.error("Failed to fetch agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const allowed = ['description', 'name']
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
        if (body[key] !== undefined) data[key] = body[key]
    }
    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    try {
        const updated = await prisma.agent_profiles.update({
            where: { agent_id: id },
            data: { ...data, updated_at: new Date() }
        })
        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
