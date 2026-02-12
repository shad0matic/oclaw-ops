export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

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

        const snapshots = await prisma.cost_snapshots.findMany({
            where: {
                snapshot_hour: { gte: since }
            },
            orderBy: { snapshot_hour: 'desc' },
            take: days * 24
        })

        return NextResponse.json(snapshots.map(s => ({
            ...s,
            id: s.id.toString()
        })))
    } catch (error) {
        console.error("Failed to fetch cost snapshots", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
