export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import si from "systeminformation"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const [cpu, mem, disk, load] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.currentLoad()
        ])

        // Get DB stats (simplified)
        // We can't easily get DB size via Prisma directly without raw query, but let's try raw query
        // or just skip for now and return system stats.

        // Postgres DB stats
        const dbName = "openclaw_db"
        let dbSize = 0
        let dbConnections = 0
        try {
            const sizeResult = await prisma.$queryRaw`SELECT pg_database_size(${dbName}) as size`
            dbSize = Number((sizeResult as any)?.[0]?.size || 0)

            // Get connection count
            const connResult = await prisma.$queryRaw`
                SELECT count(*) as count 
                FROM pg_stat_activity 
                WHERE datname = ${dbName}
            `
            dbConnections = Number((connResult as any)?.[0]?.count || 0)
        } catch (e) {
            console.error("Failed to get DB stats", e)
        }

        // Calculate next backup time (assuming daily at midnight)
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
                // Root partition usually
                total: disk[0]?.size || 0,
                used: disk[0]?.used || 0,
                free: disk[0]?.available || 0,
            },
            db: {
                size: dbSize,
                connections: dbConnections,
            },
            openclaw: {
                version: "1.0.0", // This would come from a config or package.json
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
