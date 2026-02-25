export const dynamic = "force-dynamic"
import { pool } from "@/lib/drizzle"
import { getLoadAvg } from "@/lib/system-stats"
import { NextRequest, NextResponse } from "next/server"

// GET /api/system/metrics?hours=1
// Returns time-series system metrics from the buffer table
export async function GET(request: NextRequest) {
    const hours = Math.min(24, Math.max(1, parseInt(request.nextUrl.searchParams.get("hours") || "1")))
    
    const { rows } = await pool.query(
        `SELECT ts, cpu_pct, mem_used_bytes, mem_total_bytes, disk_used_bytes, disk_total_bytes, db_size_bytes, db_connections
         FROM ops.system_metrics
         WHERE ts > now() - make_interval(hours => $1)
         ORDER BY ts ASC`,
        [hours]
    )

    const [load1] = getLoadAvg()

    const data = rows.map((r: any) => ({
        time: new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ts: new Date(r.ts).getTime(),
        cpu: parseFloat(r.cpu_pct),
        mem: (Number(r.mem_used_bytes) / Number(r.mem_total_bytes)) * 100,
        memUsed: Number(r.mem_used_bytes),
        memTotal: Number(r.mem_total_bytes),
        load: load1,
    }))

    return NextResponse.json(data)
}
