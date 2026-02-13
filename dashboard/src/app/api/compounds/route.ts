export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(req: Request) {

    try {
        const compoundsResult = await pool.query(`
            SELECT * FROM memory.compounds
            ORDER BY period_start DESC
            LIMIT 50
        `)
        const compounds = compoundsResult.rows

        return NextResponse.json(compounds.map(c => ({
            ...c,
            id: c.id.toString()
        })))
    } catch (error) {
        console.error("Failed to fetch compounds", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
