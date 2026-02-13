export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

export async function GET(req: Request) {

    const { searchParams } = new URL(req.url)
    const includeResolved = searchParams.get("include_resolved") === "true"

    try {
        let query = `
            SELECT p.*, (SELECT COUNT(*) FROM ops.cross_signals cs WHERE cs.priority_id = p.id) as signal_count
            FROM ops.priorities p
        `
        if (!includeResolved) {
            query += ` WHERE p.resolved_at IS NULL`
        }
        query += ` ORDER BY p.priority ASC, p.created_at DESC`
        
        const prioritiesResult = await pool.query(query)

        return NextResponse.json(prioritiesResult.rows.map(p => ({
            ...p,
            id: p.id.toString(),
            signal_count: parseInt(p.signal_count, 10)
        })))
    } catch (error) {
        console.error("Failed to fetch priorities", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {

    try {
        const body = await req.json()
        const { entity, entity_type, priority, context, reported_by } = body

        if (!entity || !reported_by) {
            return NextResponse.json(
                { error: "entity and reported_by are required" },
                { status: 400 }
            )
        }

        const newPriorityResult = await pool.query(`
            INSERT INTO ops.priorities (entity, entity_type, priority, context, reported_by, confirmed_by, signal_count)
            VALUES ($1, $2, $3, $4, $5, $6, 1)
            RETURNING *
        `, [
            entity,
            entity_type || "topic",
            priority || 5,
            context,
            reported_by,
            [reported_by]
        ])
        const newPriority = newPriorityResult.rows[0]

        return NextResponse.json({
            ...newPriority,
            id: newPriority.id.toString()
        })
    } catch (error) {
        console.error("Failed to create priority", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
