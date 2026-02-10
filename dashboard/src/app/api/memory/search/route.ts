import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function POST(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { query, limit = 10, type = "memories" } = body

        if (!query || query.trim() === "") {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            )
        }

        // For now, implement text search. Vector search requires embedding generation
        // which would need an external API call. We'll do simple text search for V1.
        if (type === "memories") {
            const results = await prisma.memories.findMany({
                where: {
                    OR: [
                        { content: { contains: query, mode: 'insensitive' } },
                        { tags: { hasSome: [query.toLowerCase()] } }
                    ]
                },
                orderBy: [
                    { importance: 'desc' },
                    { created_at: 'desc' }
                ],
                take: limit
            })

            return NextResponse.json({
                results: results.map(r => ({
                    ...r,
                    id: r.id.toString()
                })),
                query,
                count: results.length
            })
        } else if (type === "daily_notes") {
            const results = await prisma.daily_notes.findMany({
                where: {
                    content: { contains: query, mode: 'insensitive' }
                },
                orderBy: { note_date: 'desc' },
                take: limit
            })

            return NextResponse.json({
                results: results.map(r => ({
                    ...r,
                    id: r.id.toString()
                })),
                query,
                count: results.length
            })
        } else {
            return NextResponse.json(
                { error: "Invalid search type. Use 'memories' or 'daily_notes'" },
                { status: 400 }
            )
        }
    } catch (error) {
        console.error("Memory search failed", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
