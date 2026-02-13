export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const reactionsResult = await pool.query(`
            SELECT * FROM ops.reactions ORDER BY created_at DESC
        `)
        return NextResponse.json(reactionsResult.rows)
    } catch (error) {
        console.error("Failed to fetch reactions", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { trigger_agent, trigger_event, responder_agent, action, trigger_filter, action_params, probability, enabled } = body

        if (!trigger_agent || !trigger_event || !responder_agent || !action) {
            return NextResponse.json(
                { error: "trigger_agent, trigger_event, responder_agent, and action are required" },
                { status: 400 }
            )
        }

        const reactionResult = await pool.query(`
            INSERT INTO ops.reactions (trigger_agent, trigger_event, trigger_filter, responder_agent, action, action_params, probability, enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            trigger_agent,
            trigger_event,
            trigger_filter || {},
            responder_agent,
            action,
            action_params || {},
            probability || 1.0,
            enabled !== false
        ])
        const reaction = reactionResult.rows[0]

        return NextResponse.json(reaction)
    } catch (error) {
        console.error("Failed to create reaction", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
