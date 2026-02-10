import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await req.json()
        const { feedback } = body

        // Get current agent
        const agent = await prisma.agent_profiles.findUnique({
            where: { agent_id: id }
        })

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        const currentLevel = agent.level || 1
        if (currentLevel >= 4) {
            return NextResponse.json(
                { error: "Agent is already at maximum level (4)" },
                { status: 400 }
            )
        }

        const newLevel = currentLevel + 1

        // Update agent level in a transaction
        const [updatedAgent, review] = await prisma.$transaction([
            prisma.agent_profiles.update({
                where: { agent_id: id },
                data: {
                    level: newLevel,
                    updated_at: new Date()
                }
            }),
            prisma.performance_reviews.create({
                data: {
                    agent_id: id,
                    reviewer: session.user?.email || "system",
                    rating: 5,
                    level_before: currentLevel,
                    level_after: newLevel,
                    feedback: feedback || `Promoted from level ${currentLevel} to ${newLevel}`,
                    output_summary: "Level promotion"
                }
            })
        ])

        return NextResponse.json({
            agent: updatedAgent,
            review
        })
    } catch (error) {
        console.error("Failed to promote agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
