export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const [
            totalMemoriesResult,
            totalDailyNotesResult,
            memoryByAgentResult,
            recentMemoriesResult,
            averageImportanceResult,
            tagsResult
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM memory.memories`),
            pool.query(`SELECT COUNT(*) FROM memory.daily_notes`),
            pool.query(`SELECT agent_id, COUNT(*) as count FROM memory.memories GROUP BY agent_id`),
            pool.query(`SELECT id, content, importance, created_at, agent_id FROM memory.memories ORDER BY created_at DESC LIMIT 5`),
            pool.query(`SELECT AVG(importance) as avg_importance FROM memory.memories`),
            pool.query(`SELECT tags FROM memory.memories`)
        ])

        const totalMemories = parseInt(totalMemoriesResult.rows[0].count, 10)
        const totalDailyNotes = parseInt(totalDailyNotesResult.rows[0].count, 10)
        const memoryByAgent = memoryByAgentResult.rows
        const recentMemories = recentMemoriesResult.rows.map(m => ({ ...m, id: m.id.toString() }))
        const averageImportance = parseFloat(averageImportanceResult.rows[0].avg_importance) || 0

        const tagCounts: Record<string, number> = {}
        tagsResult.rows.forEach(m => {
            m.tags.forEach((tag: string) => {
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
            average_importance: averageImportance,
            by_agent: memoryByAgent,
            top_tags: topTags,
            recent_memories: recentMemories
        })
    } catch (error) {
        console.error("Failed to fetch memory stats", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
