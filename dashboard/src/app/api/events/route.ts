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
    const limit = parseInt(searchParams.get("limit") || "20")
    const agentId = searchParams.get("agent_id")

    try {
        const where = agentId ? { agent_id: agentId } : {}

        const events = await prisma.agent_events.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: limit,
        })

        return NextResponse.json(events)
    } catch (error) {
        console.error("Failed to fetch events", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
