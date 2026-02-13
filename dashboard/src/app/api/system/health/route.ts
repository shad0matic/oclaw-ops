export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import si from "systeminformation"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const [cpu, mem, disk] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ])

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
                usage: cpu.currentLoad,
            },
            memory: {
                total: mem.total,
                used: mem.active,
                free: mem.available,
            },
            disk: {
                total: disk[0]?.size || 0,
                used: disk[0]?.used || 0,
                free: disk[0]?.available || 0,
            },
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
            uptime: si.time().uptime,
        })
    } catch (error) {
        console.error("System health check failed", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
