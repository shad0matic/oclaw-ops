export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { taskQueueInOps } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

async function notifyKevin(task: any, action: string) {
  const gwToken = process.env.OPENCLAW_GW_TOKEN
  if (!gwToken) return
  const emoji = action === 'run' ? '⚡' : '📋'
  const msg = `${emoji} Kanban: #${task.id} "${task.title}" → ${action}${task.agentId ? ` (assigned: ${task.agentId})` : ' (unassigned)'}\nProject: ${task.project || 'unknown'}\nDescription: ${(task.description || 'none').substring(0, 200)}`
  await fetch('http://127.0.0.1:18789/api/sessions/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gwToken}` },
    body: JSON.stringify({
      sessionKey: 'agent:main:telegram:group:-1003396419207:topic:710',
      message: msg,
    }),
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }
  const bigId = BigInt(numId)
  const body = await request.json()
  const { action } = body

  const where = eq(taskQueueInOps.id, bigId)

  switch (action) {
    case "assign":
      await db.update(taskQueueInOps).set({ agentId: body.agentId, status: 'assigned' }).where(where)
      break
    case "run":
      await db.update(taskQueueInOps).set({
        status: 'running',
        ...(body.agentId ? { agentId: body.agentId } : {}),
        startedAt: sql`now()`,
      }).where(where)
      break
    case "complete":
      await db.update(taskQueueInOps).set({
        status: 'done', completedAt: sql`now()`,
        result: body.result || {},
      }).where(where)
      break
    case "fail":
      await db.update(taskQueueInOps).set({
        status: 'failed', completedAt: sql`now()`,
        result: { error: body.result || 'unknown' },
      }).where(where)
      break
    case "cancel":
      await db.update(taskQueueInOps).set({ status: 'cancelled', completedAt: sql`now()` }).where(where)
      break
    case "plan":
      await db.update(taskQueueInOps).set({ status: 'planned' }).where(where)
      break
    case "review":
      await db.update(taskQueueInOps).set({
        status: 'review',
        reviewCount: sql`review_count + 1`,
        reviewerId: body.reviewerId,
        reviewFeedback: body.reviewFeedback,
      }).where(where)
      break
    case "human":
      await db.update(taskQueueInOps).set({ status: 'human_todo' }).where(where)
      break
    case "requeue":
      await db.update(taskQueueInOps).set({
        status: 'queued', agentId: null, startedAt: null, completedAt: null,
      }).where(where)
      break
    case "approve":
      await db.update(taskQueueInOps).set({ status: 'human_todo' }).where(where)
      break
    case "reject":
      await db.update(taskQueueInOps).set({
        status: 'running', reviewFeedback: body.reviewFeedback,
      }).where(where)
      break
    case "update": {
      const { fields } = body
      if (!fields || typeof fields !== 'object') return NextResponse.json({ error: "fields required" }, { status: 400 })
      const allowed: Record<string, keyof typeof taskQueueInOps.$inferInsert> = {
        title: 'title', description: 'description', priority: 'priority',
        project: 'project', agent_id: 'agentId', spec_url: 'specUrl', speced: 'speced', epic: 'epic',
      }
      const values: Partial<typeof taskQueueInOps.$inferInsert> = {}
      for (const [k, v] of Object.entries(fields)) {
        const col = allowed[k]
        if (col) (values as any)[col] = v
      }
      if (Object.keys(values).length === 0) return NextResponse.json({ error: "no valid fields" }, { status: 400 })
      await db.update(taskQueueInOps).set(values).where(where)
      break
    }
    default:
      return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const [task] = await db.select().from(taskQueueInOps).where(where)
  const result = { ...task, id: Number(task.id) }

  if (action === 'run' || action === 'plan') {
    notifyKevin(result, action).catch(() => {})
  }

  return NextResponse.json(result)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }
  await db.delete(taskQueueInOps).where(eq(taskQueueInOps.id, BigInt(numId)))
  return NextResponse.json({ ok: true })
}
