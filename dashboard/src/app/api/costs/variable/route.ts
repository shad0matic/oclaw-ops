export const dynamic = "force-dynamic"
import { pool } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"

// GET /api/costs/variable?days=30
// Returns variable (API) costs for the cost-card component
export async function GET(request: NextRequest) {
    const days = Math.min(90, Math.max(1, parseInt(request.nextUrl.searchParams.get("days") || "30")))

    // Daily variable costs
    const { rows: daily } = await pool.query(`
        SELECT 
            date_trunc('day', snapshot_hour)::date as day,
            COALESCE(SUM(variable_eur), 0) as cost
        FROM ops.cost_snapshots
        WHERE snapshot_hour > now() - make_interval(days => $1)
        GROUP BY 1
        ORDER BY 1 ASC
    `, [days])

    // Current month total variable
    const { rows: [month] } = await pool.query(`
        SELECT COALESCE(SUM(variable_eur), 0) as total
        FROM ops.cost_snapshots
        WHERE snapshot_hour >= date_trunc('month', now())
    `)

    const total = Number(month?.total ?? 0)
    const dailyData = daily.map((r: any) => ({
        day: r.day,
        cost: Number(r.cost),
    }))

    // Project month-end cost
    const now = new Date()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projected = dayOfMonth > 0 ? Math.round((total / dayOfMonth) * daysInMonth * 100) / 100 : 0

    // Tier based on projected cost
    let tier: string
    if (projected < 10) tier = "green"
    else if (projected < 50) tier = "yellow"
    else if (projected < 150) tier = "orange"
    else tier = "red"

    return NextResponse.json({
        total,
        daily: dailyData,
        projected,
        tier,
    })
}
