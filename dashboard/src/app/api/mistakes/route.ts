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
    const agentId = searchParams.get("agent_id")
    const includeResolved = searchParams.get("include_resolved") === "true"

    try {
        const where: any = {}
        if (agentId) where.agent_id = agentId
        if (!includeResolved) where.resolved = false

        const mistakes = await prisma.mistakes.findMany({
            where,
            orderBy: [
                { severity: 'desc' },
                { last_occurred_at: 'desc' }
            ]
        })

        return NextResponse.json(mistakes.map(m => ({
            ...m,
            id: m.id.toString()
        })))
    } catch (error) {
        console.error("Failed to fetch mistakes", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { agent_id, description, context, lesson_learned, severity } = body

        if (!agent_id || !description) {
            return NextResponse.json(
                { error: "agent_id and description are required" },
                { status: 400 }
            )
        }

        const mistake = await prisma.mistakes.create({
            data: {
                agent_id,
                description,
                context,
                lesson_learned,
                severity: severity || 3,
                recurrence_count: 1,
                resolved: false
            }
        })

        return NextResponse.json({
            ...mistake,
            id: mistake.id.toString()
        })
    } catch (error) {
        console.error("Failed to create mistake", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
