import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export const dynamic = "force-dynamic"

interface SubAgentRun {
    agent_id: string
    task: string
    spawned_by: string
    model: string
    status: "completed" | "running" | "failed" | "zombie"
    duration_minutes: number | null
    started_at: string
}

export async function GET() {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

        // Find all task_start events in the last 24h
        const taskStartsResult = await pool.query(`
            SELECT * FROM ops.agent_events
            WHERE event_type = 'task_start' AND created_at >= $1
            ORDER BY created_at DESC
        `, [twentyFourHoursAgo])
        const taskStarts = taskStartsResult.rows

        const runs: SubAgentRun[] = []

        for (const start of taskStarts) {
            const detail = start.detail as any
            
            // Include if: has spawned_by, is known sub-agent, or agent_id != "main"
            const isSubAgent = detail?.spawned_by || start.agent_id !== "main"
            if (!isSubAgent) continue

            // Look for completion event
            const completion = await prisma.agent_events.findFirst({
                where: {
                    agent_id: start.agent_id,
                    event_type: { in: ["task_complete", "task_fail", "error"] },
                    created_at: { gte: start.created_at! },
                },
                orderBy: { created_at: "asc" },
            })

            const task = detail?.task || detail?.description || "Unknown task"
            const spawned_by = detail?.spawned_by || "Kevin"
            const model = detail?.model || "unknown"
            
            let status: SubAgentRun["status"]
            let duration_minutes: number | null = null

            if (completion) {
                // Task completed
                status = completion.event_type === "task_complete" ? "completed" : "failed"
                const durationMs = completion.created_at!.getTime() - start.created_at!.getTime()
                duration_minutes = durationMs / 1000 / 60
            } else if (start.created_at! < thirtyMinutesAgo) {
                // No completion and older than 30 min = zombie
                status = "zombie"
                const durationMs = Date.now() - start.created_at!.getTime()
                duration_minutes = durationMs / 1000 / 60
            } else {
                // Still running
                status = "running"
                duration_minutes = null
            }

            runs.push({
                agent_id: start.agent_id,
                task,
                spawned_by,
                model,
                status,
                duration_minutes,
                started_at: start.created_at!.toISOString(),
            })
        }

        return NextResponse.json(runs)
    } catch (error) {
        console.error("Error fetching sub-agent sessions:", error)
        return NextResponse.json([], { status: 500 })
    }
}
