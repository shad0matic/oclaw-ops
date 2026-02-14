export const dynamic = "force-dynamic"
import { db, pool } from "@/lib/drizzle"
import { taskQueueInOps, agentEventsInOps, agentProfilesInMemory } from "@/lib/schema"
import { eq, asc, desc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  try {
    // Get the task
    const [task] = await db.select().from(taskQueueInOps)
      .where(eq(taskQueueInOps.id, BigInt(numId)))

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    // Get timeline events
    const events = await db.select({
      id: agentEventsInOps.id,
      agentId: agentEventsInOps.agentId,
      eventType: agentEventsInOps.eventType,
      detail: agentEventsInOps.detail,
      costUsd: agentEventsInOps.costUsd,
      tokensUsed: agentEventsInOps.tokensUsed,
      createdAt: agentEventsInOps.createdAt,
    })
      .from(agentEventsInOps)
      .where(eq(agentEventsInOps.taskId, numId))
      .orderBy(asc(agentEventsInOps.createdAt))

    // Get agent profiles for enrichment
    const agents = await db.select().from(agentProfilesInMemory)
    const agentMap = Object.fromEntries(agents.map(a => [a.agentId, a.name]))

    // Compute stats
    const totalCost = events.reduce((sum, e) => sum + (Number(e.costUsd) || 0), 0)
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed || 0), 0)
    const involvedAgents = [...new Set(events.map(e => e.agentId))]

    // Duration
    const startEvent = events.find(e => e.eventType === 'task_start')
    const endEvent = [...events].reverse().find(e => ['task_complete', 'task_fail'].includes(e.eventType))
    let durationSeconds: number | null = null
    if (startEvent?.createdAt && endEvent?.createdAt) {
      durationSeconds = Math.round((new Date(endEvent.createdAt).getTime() - new Date(startEvent.createdAt).getTime()) / 1000)
    } else if (startEvent?.createdAt && task.status === 'running') {
      durationSeconds = Math.round((Date.now() - new Date(startEvent.createdAt).getTime()) / 1000)
    }

    // Sub-agent spawns
    const spawns = events
      .filter(e => {
        const d = e.detail as any
        return d?.spawned_by || d?.model
      })
      .map(e => {
        const d = e.detail as any
        return {
          agentId: e.agentId,
          agentName: agentMap[e.agentId] || e.agentId,
          model: d?.model || null,
          spawnedBy: d?.spawned_by || null,
          at: e.createdAt,
        }
      })

    // Enrich timeline
    const timeline = events.map(e => ({
      id: Number(e.id),
      agentId: e.agentId,
      agentName: agentMap[e.agentId] || e.agentId,
      eventType: e.eventType,
      detail: e.detail,
      costUsd: Number(e.costUsd) || 0,
      tokensUsed: e.tokensUsed || 0,
      createdAt: e.createdAt,
    }))

    return NextResponse.json({
      task: { ...task, id: Number(task.id), spec_url: task.specUrl, agent_id: task.agentId, review_feedback: task.reviewFeedback, reviewer_id: task.reviewerId, review_count: task.reviewCount, created_at: task.createdAt, started_at: task.startedAt, completed_at: task.completedAt, created_by: task.createdBy },
      timeline,
      stats: {
        totalCost,
        totalTokens,
        durationSeconds,
        involvedAgents: involvedAgents.map(id => ({ id, name: agentMap[id] || id })),
        eventCount: events.length,
      },
      spawns,
    })
  } catch (error) {
    console.error("Task detail error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
