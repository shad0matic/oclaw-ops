export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const [
            totalMemories,
            totalDailyNotes,
            memoryByAgent,
            recentMemories,
            averageImportance
        ] = await Promise.all([
            prisma.memories.count(),
            prisma.daily_notes.count(),
            prisma.memories.groupBy({
                by: ['agent_id'],
                _count: true
            }),
            prisma.memories.findMany({
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    id: true,
                    content: true,
                    importance: true,
                    created_at: true,
                    agent_id: true
                }
            }),
            prisma.memories.aggregate({
                _avg: {
                    importance: true
                }
            })
        ])

        // Get tag distribution
        const allMemories = await prisma.memories.findMany({
            select: { tags: true }
        })
        
        const tagCounts: Record<string, number> = {}
        allMemories.forEach(m => {
            m.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
        })

        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }))

        return NextResponse.json({
            total_memories: totalMemories,
            total_daily_notes: totalDailyNotes,
            average_importance: averageImportance._avg.importance || 0,
            by_agent: memoryByAgent.map(m => ({
                agent_id: m.agent_id,
                count: m._count
            })),
            top_tags: topTags,
            recent_memories: recentMemories.map(m => ({
                ...m,
                id: m.id.toString()
            }))
        })
    } catch (error) {
        console.error("Failed to fetch memory stats", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
