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
        const { feedback } = body

        const agentResult = await pool.query(`
            SELECT * FROM ops.agent_profiles WHERE agent_id = $1;
        `, [id]);

        if (!agentResult || !agentResult.rows || agentResult.rows.length === 0) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        const agent = agentResult.rows[0];
        const currentLevel = agent.level || 1
        if (currentLevel >= 4) {
            return NextResponse.json(
                { error: "Agent is already at maximum level (4)" },
                { status: 400 }
            )
        }

        const newLevel = currentLevel + 1

        // Update agent level and create review with raw SQL
        await pool.query(`
            UPDATE ops.agent_profiles
            SET level = $1, updated_at = NOW()
            WHERE agent_id = $2;
        `, [newLevel, id]);

        await pool.query(`
            INSERT INTO ops.performance_reviews (agent_id, reviewer, rating, level_before, level_after, feedback, output_summary)
            VALUES ($1, $2, 5, $3, $4, $5, 'Level promotion');
        `, [id, "boss", currentLevel, newLevel, feedback || `Promoted from level ${currentLevel} to ${newLevel}`]);

        // Fetch updated agent data for response
        const updatedAgentResult = await pool.query(`
            SELECT * FROM ops.agent_profiles WHERE agent_id = $1;
        `,[id]);

        // Handle the result as an array
        const updatedAgent = updatedAgentResult.rows[0] || {};

        return NextResponse.json({
            agent: updatedAgent,
            review: { feedback: feedback || `Promoted from level ${currentLevel} to ${newLevel}` }
        })
    } catch (error) {
        console.error("Failed to promote agent", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
