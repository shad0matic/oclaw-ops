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

        // Postgres DB size
        const dbName = "openclaw_db"
        let dbSize = 0
        try {
            const result = await prisma.$queryRaw`SELECT pg_database_size(${dbName}) as size`
            // Handle result type safely
            const size = Number((result as any)?.[0]?.size || 0)
            dbSize = size
        } catch (e) {
            console.error("Failed to get DB size", e)
        }

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
            },
            db: {
                size: dbSize,
            },
            uptime: si.time().uptime,
        })
    } catch (error) {
        console.error("System health check failed", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
