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
    const days = parseInt(searchParams.get("days") || "30")

    try {
        const since = new Date()
        since.setDate(since.getDate() - days)

        const snapshotsResult = await pool.query(`
            SELECT * FROM ops.cost_snapshots
            WHERE snapshot_hour >= $1
            ORDER BY snapshot_hour DESC
            LIMIT $2
        `, [since, days * 24])
        const snapshots = snapshotsResult.rows

        return NextResponse.json(snapshots.map(s => ({
            ...s,
            id: s.id.toString(),
            cost_usd: Number(s.cost_usd)
        })))
    } catch (error) {
        console.error("Failed to fetch cost snapshots", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
