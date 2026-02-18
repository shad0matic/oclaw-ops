export const dynamic = "force-dynamic"
import { db, pool } from "@/lib/drizzle"
import { taskQueueInOps, agentProfilesInMemory } from "@/lib/schema"
import { eq, and, asc, sql, SQL } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project")
  const status = request.nextUrl.searchParams.get("status")

  const conditions: SQL[] = []
  if (project) conditions.push(eq(taskQueueInOps.project, project))
  if (status) conditions.push(eq(taskQueueInOps.status, status))

  const rows = await db.select({
    task: taskQueueInOps,
    agentName: agentProfilesInMemory.name,
  })
    .from(taskQueueInOps)
    .leftJoin(agentProfilesInMemory, eq(agentProfilesInMemory.agentId, taskQueueInOps.agentId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      sql`CASE ${taskQueueInOps.status} WHEN 'running' THEN 0 WHEN 'assigned' THEN 1 WHEN 'planned' THEN 2 WHEN 'queued' THEN 3 ELSE 4 END`,
      asc(taskQueueInOps.priority),
      asc(taskQueueInOps.createdAt),
    )

  const taskIds = rows.map(r => r.task.id)
  
  // Fetch comments for all tasks in one query
  let commentsMap: Record<number, any[]> = {}
  if (taskIds.length > 0) {
    const { rows: commentRows } = await pool.query(
      `SELECT id, task_id, author, message, created_at, read_at, read_by 
       FROM ops.task_comments 
       WHERE task_id = ANY($1) 
       ORDER BY created_at DESC`,
      [taskIds]
    )
    for (const c of commentRows) {
      if (!commentsMap[c.task_id]) commentsMap[c.task_id] = []
      commentsMap[c.task_id].push(c)
    }
  }

  const tasks = rows.map(({ task, agentName }) => ({
    ...task,
    id: Number(task.id),
    priority: Number(task.priority),
    agent_name: agentName,
    spec_url: task.specUrl,
    agent_id: task.agentId,
    created_at: task.createdAt,
    started_at: task.startedAt,
    completed_at: task.completedAt,
    review_feedback: task.reviewFeedback,
    reviewer_id: task.reviewerId,
    notes: task.notes,
    created_by: task.createdBy,
    progress: task.progress,
    tags: task.tags,
    chat_acked_at: task.chatAckedAt,
    comments: commentsMap[Number(task.id)] || [],
  }))

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, project = "infra", agentId, priority = 5, status: requestedStatus } = body

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const validStatuses = ['queued', 'planned', 'assigned', 'running', 'review', 'human_todo', 'done']
  const finalStatus = requestedStatus && validStatuses.includes(requestedStatus)
    ? requestedStatus
    : agentId ? 'assigned' : 'queued'

  const [row] = await db.insert(taskQueueInOps).values({
    title,
    description: description || null,
    project,
    agentId: agentId || null,
    priority,
    status: finalStatus,
  }).returning()

  return NextResponse.json({ ...row, id: Number(row.id) }, { status: 201 })
}
