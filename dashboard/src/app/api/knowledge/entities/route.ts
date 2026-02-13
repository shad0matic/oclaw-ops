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
    const entityType = searchParams.get("entity_type")

    try {
        let query = `SELECT * FROM memory.entities`
        const values: any[] = []

        if (entityType) {
            query += ` WHERE entity_type = $1`
            values.push(entityType)
        }

        query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`
        values.push(100)
        
        const entitiesResult = await pool.query(query, values)

        const entities = entitiesResult.rows.map(e => ({
            ...e,
            id: e.id.toString()
        }))

        return NextResponse.json(entities)
    } catch (error) {
        console.error("Failed to fetch entities", error)
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
        const { name, entity_type, aliases, properties, first_seen_by } = body

        if (!name) {
            return NextResponse.json(
                { error: "name is required" },
                { status: 400 }
            )
        }

        const entityResult = await pool.query(`
            INSERT INTO memory.entities (name, entity_type, aliases, properties, first_seen_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            name,
            entity_type || "unknown",
            aliases || [],
            properties || {},
            first_seen_by
        ])

        const entity = entityResult.rows[0]

        return NextResponse.json({
            ...entity,
            id: entity.id.toString()
        })
    } catch (error) {
        console.error("Failed to create entity", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
