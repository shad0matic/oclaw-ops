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
        const { rating, feedback, output_summary } = body

        // Validate required fields
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Rating must be between 1 and 5" },
                { status: 400 }
            )
        }

        // Get current agent
        const agent = await prisma.agent_profiles.findUnique({
            where: { agent_id: id }
        })

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        // Create review
        const review = await prisma.performance_reviews.create({
            data: {
                agent_id: id,
                reviewer: session.user?.email || "unknown",
                rating,
                feedback,
                output_summary,
                level_before: agent.level,
                level_after: agent.level
            }
        })

        return NextResponse.json(review)
    } catch (error) {
        console.error("Failed to create review", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
