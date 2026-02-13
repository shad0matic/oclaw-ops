export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { parseStringId } from "@/lib/validate"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id: rawId } = await params
    const [id, idErr] = parseStringId(rawId)
    if (idErr) return idErr

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
        const agentResult = await pool.query(
            `SELECT * FROM memory.agent_profiles WHERE agent_id = $1`,
            [id]
        )
        const agent = agentResult.rows[0]

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        // Create review
        const reviewResult = await pool.query(
            `INSERT INTO memory.performance_reviews (agent_id, reviewer, rating, feedback, output_summary, level_before, level_after)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                id,
                "boss",
                rating,
                feedback,
                output_summary,
                agent.level,
                agent.level
            ]
        )
        const review = reviewResult.rows[0]

        return NextResponse.json(review)
    } catch (error) {
        console.error("Failed to create review", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
