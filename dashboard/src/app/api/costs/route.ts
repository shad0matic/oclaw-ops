export const dynamic = "force-dynamic"
import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/costs?days=30
// Returns daily aggregated costs + current month totals
export async function GET(request: NextRequest) {
    const days = Math.min(90, Math.max(1, parseInt(request.nextUrl.searchParams.get("days") || "30")))

    // Daily aggregates for chart
    const { rows: daily } = await pool.query(`
        SELECT 
            date_trunc('day', snapshot_hour)::date as day,
            SUM(fixed_eur) as fixed,
            SUM(variable_eur) as variable,
            SUM(total_eur) as total
        FROM ops.cost_snapshots
        WHERE snapshot_hour > now() - make_interval(days => $1)
        GROUP BY 1
        ORDER BY 1 ASC
    `, [days])

    // Current month totals
    const { rows: [month] } = await pool.query(`
        SELECT 
            COALESCE(SUM(fixed_eur), 0) as fixed,
            COALESCE(SUM(variable_eur), 0) as variable,
            COALESCE(SUM(total_eur), 0) as total
        FROM ops.cost_snapshots
        WHERE snapshot_hour >= date_trunc('month', now())
    `)

    // Latest FX rate (ECB daily table)
    // ops.fx_rates columns: rate_date, usd_to_eur, created_at
    const { rows: [fx] } = await pool.query(`
        SELECT usd_to_eur, rate_date, created_at
        FROM ops.fx_rates
        ORDER BY rate_date DESC
        LIMIT 1
    `)

    const data = daily.map((r: any) => ({
        day: r.day,
        fixed: Number(r.fixed),
        variable: Number(r.variable),
        total: Number(r.total),
    }))

    return NextResponse.json({
        daily: data,
        month: {
            fixed: Number(month?.fixed ?? 0),
            variable: Number(month?.variable ?? 0),
            total: Number(month?.total ?? 0),
        },
        fxRate: fx ? { usdEur: Number(fx.usd_to_eur), asOf: fx.rate_date } : null,
    })
}
