export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(req: Request) {

    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get("agent_id")
    const includeResolved = searchParams.get("include_resolved") === "true"

    try {
        let query = `SELECT * FROM ops.mistakes`
        const values = []
        const whereClauses = []

        if (agentId) {
            whereClauses.push(`agent_id = $${values.length + 1}`)
            values.push(agentId)
        }
        if (!includeResolved) {
            whereClauses.push(`resolved = false`)
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`
        }

        query += ` ORDER BY severity DESC, last_occurred_at DESC`

        const mistakesResult = await pool.query(query, values)
        const mistakes = mistakesResult.rows.map(m => ({
            ...m,
            id: m.id.toString()
        }))

        return NextResponse.json(mistakes)
    } catch (error) {
        console.error("Failed to fetch mistakes", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {

    try {
        const body = await req.json()
        const { agent_id, description, context, lesson_learned, severity } = body

        if (!agent_id || !description) {
            return NextResponse.json(
                { error: "agent_id and description are required" },
                { status: 400 }
            )
        }

        const mistakeResult = await pool.query(`
            INSERT INTO ops.mistakes (agent_id, description, context, lesson_learned, severity, recurrence_count, resolved)
            VALUES ($1, $2, $3, $4, $5, 1, false)
            RETURNING *
        `, [agent_id, description, context, lesson_learned, severity || 3])
        const mistake = mistakeResult.rows[0]

        return NextResponse.json({
            ...mistake,
            id: mistake.id.toString()
        })
    } catch (error) {
        console.error("Failed to create mistake", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
