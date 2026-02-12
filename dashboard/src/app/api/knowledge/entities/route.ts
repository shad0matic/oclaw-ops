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
    const entityType = searchParams.get("entity_type")

    try {
        const where = entityType ? { entity_type: entityType } : {}

        const entities = await prisma.entities.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 100
        })

        return NextResponse.json(entities.map(e => ({
            ...e,
            id: e.id.toString()
        })))
    } catch (error) {
        console.error("Failed to fetch entities", error)
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
        const { name, entity_type, aliases, properties, first_seen_by } = body

        if (!name) {
            return NextResponse.json(
                { error: "name is required" },
                { status: 400 }
            )
        }

        const entity = await prisma.entities.create({
            data: {
                name,
                entity_type: entity_type || "unknown",
                aliases: aliases || [],
                properties: properties || {},
                first_seen_by
            }
        })

        return NextResponse.json({
            ...entity,
            id: entity.id.toString()
        })
    } catch (error) {
        console.error("Failed to create entity", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
