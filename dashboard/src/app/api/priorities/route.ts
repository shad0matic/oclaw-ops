import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeResolved = searchParams.get("include_resolved") === "true"

    try {
        const where = includeResolved ? {} : { resolved_at: null }
        
        const priorities = await prisma.priorities.findMany({
            where,
            orderBy: [
                { priority: 'asc' },
                { created_at: 'desc' }
            ],
            include: {
                _count: {
                    select: { cross_signals: true }
                }
            }
        })

        return NextResponse.json(priorities.map(p => ({
            ...p,
            id: p.id.toString(),
            signal_count: p._count.cross_signals
        })))
    } catch (error) {
        console.error("Failed to fetch priorities", error)
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
        const { entity, entity_type, priority, context, reported_by } = body

        if (!entity || !reported_by) {
            return NextResponse.json(
                { error: "entity and reported_by are required" },
                { status: 400 }
            )
        }

        const newPriority = await prisma.priorities.create({
            data: {
                entity,
                entity_type: entity_type || "topic",
                priority: priority || 5,
                context,
                reported_by,
                confirmed_by: [reported_by],
                signal_count: 1
            }
        })

        return NextResponse.json({
            ...newPriority,
            id: newPriority.id.toString()
        })
    } catch (error) {
        console.error("Failed to create priority", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
