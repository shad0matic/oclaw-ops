export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

export async function POST(req: Request) {

    try {
        const body = await req.json()
        const { query, limit = 10, type = "memories" } = body

        if (!query || query.trim() === "") {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            )
        }

        if (type === "memories") {
            const results = await pool.query(`
                SELECT * FROM memory.memories
                WHERE content ILIKE $1 OR tags @> ARRAY[$2]
                ORDER BY importance DESC, created_at DESC
                LIMIT $3
            `, [`%${query}%`, query.toLowerCase(), limit])

            return NextResponse.json({
                results: results.rows.map(r => ({
                    ...r,
                    id: r.id.toString()
                })),
                query,
                count: results.rowCount
            })
        } else if (type === "daily_notes") {
            const results = await pool.query(`
                SELECT * FROM memory.daily_notes
                WHERE content ILIKE $1
                ORDER BY note_date DESC
                LIMIT $2
            `, [`%${query}%`, limit])

            return NextResponse.json({
                results: results.rows.map(r => ({
                    ...r,
                    id: r.id.toString()
                })),
                query,
                count: results.rowCount
            })
        } else {
            return NextResponse.json(
                { error: "Invalid search type. Use 'memories' or 'daily_notes'" },
                { status: 400 }
            )
        }
    } catch (error) {
        console.error("Memory search failed", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
