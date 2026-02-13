export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCpuLoad, getMemStats, getUptime } from "@/lib/system-stats"
import { readFileSync } from "fs"
import { pool } from "@/lib/drizzle"

function getDiskStats() {
    try {
        const mounts = readFileSync("/proc/mounts", "utf8")
        const rootMount = mounts.split("\n").find(l => l.includes(" / "))
        if (!rootMount) return { total: 0, used: 0, free: 0 }
        // Use statfs via child-free approach - just return 0 for now, WS handles real-time
        return { total: 0, used: 0, free: 0 }
    } catch { return { total: 0, used: 0, free: 0 } }
}

export async function GET(req: Request) {
    try {
        const cpuLoad = getCpuLoad()
        const mem = getMemStats()
        const uptime = getUptime()

        const dbName = "openclaw_db"
        let dbSize = 0
        let dbConnections = 0
        try {
            const sizeResult = await pool.query(`SELECT pg_database_size($1) as size`, [dbName])
            dbSize = Number(sizeResult.rows[0]?.size || 0)

            const connResult = await pool.query(`
                SELECT count(*) as count 
                FROM pg_stat_activity 
                WHERE datname = $1
            `, [dbName])
            dbConnections = Number(connResult.rows[0]?.count || 0)
        } catch (e) {
            console.error("Failed to get DB stats", e)
        }

        const now = new Date()
        const nextBackup = new Date(now)
        nextBackup.setDate(nextBackup.getDate() + 1)
        nextBackup.setHours(0, 0, 0, 0)
        const hoursUntilBackup = Math.round((nextBackup.getTime() - now.getTime()) / (1000 * 60 * 60))

        return NextResponse.json({
            cpu: {
                usage: cpuLoad,
            },
            memory: {
                total: mem.total,
                used: mem.active,
                free: mem.total - mem.active,
            },
            disk: getDiskStats(),
            db: {
                size: dbSize,
                connections: dbConnections,
            },
            openclaw: {
                version: "1.0.0",
                status: "running"
            },
            backup: {
                next_in_hours: hoursUntilBackup
            },
            uptime,
        })
    } catch (error) {
        console.error("System health check failed", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
