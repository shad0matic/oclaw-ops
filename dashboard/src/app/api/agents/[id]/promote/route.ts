export const dynamic = "force-dynamic"
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
        const agentResult = await prisma.$queryRawUnsafe(`
            SELECT * FROM ops.agent_profiles WHERE agent_id = '${id}';
        `);

        if (!agentResult || !Array.isArray(agentResult) || agentResult.length === 0) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        const agent = agentResult[0];
        const currentLevel = agent.level || 1
        if (currentLevel >= 4) {
            return NextResponse.json(
                { error: "Agent is already at maximum level (4)" },
                { status: 400 }
            )
        }

        const newLevel = currentLevel + 1

        // Update agent level and create review with raw SQL
        const updateAgent = await prisma.$executeRawUnsafe(`
            UPDATE ops.agent_profiles
            SET level = ${newLevel}, updated_at = NOW()
            WHERE agent_id = '${id}';
        `);

        const createReview = await prisma.$executeRawUnsafe(`
            INSERT INTO ops.performance_reviews (agent_id, reviewer, rating, level_before, level_after, feedback, output_summary)
            VALUES ('${id}', '${session.user?.email || "system"}', 5, ${currentLevel}, ${newLevel}, '${feedback || `Promoted from level ${currentLevel} to ${newLevel}`}', 'Level promotion');
        `);

        // Fetch updated agent data for response
        const updatedAgentResult = await prisma.$queryRawUnsafe(`
            SELECT * FROM ops.agent_profiles WHERE agent_id = '${id}';
        `);

        // Handle the result as an array
        const updatedAgent = Array.isArray(updatedAgentResult) && updatedAgentResult.length > 0 ? updatedAgentResult[0] : {};

        return NextResponse.json({
            agent: updatedAgent,
            review: { feedback: feedback || `Promoted from level ${currentLevel} to ${newLevel}` }
        })
    } catch (error) {
        console.error("Failed to promote agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
