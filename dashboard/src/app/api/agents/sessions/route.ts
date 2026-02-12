import { NextResponse } from "next/server"
import prisma from "@/lib/db"

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
        const taskStarts = await prisma.agent_events.findMany({
            where: {
                event_type: "task_start",
                created_at: { gte: twentyFourHoursAgo },
            },
            orderBy: { created_at: "desc" },
        })

        const runs: SubAgentRun[] = []

        for (const start of taskStarts) {
            const detail = start.detail as any
            
            // Only include if it's a sub-agent (has spawned_by or is known sub-agent)
            const isSubAgent = detail?.spawned_by || ["bob", "nefario", "xreader"].includes(start.agent_id)
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
