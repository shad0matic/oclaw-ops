export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const agentId = searchParams.get("agent_id")

    try {
        let query = `
            SELECT * FROM ops.agent_events
        `
        const values = []

        if (agentId) {
            query += ` WHERE agent_id = $1`
            values.push(agentId)
        }

        query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`
        values.push(limit)

        const eventsResult = await pool.query(query, values)
        const events = eventsResult.rows.map(event => ({
            ...event,
            id: Number(event.id)
        }))

        return NextResponse.json(events)
    } catch (error) {
        console.error("Failed to fetch events", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
