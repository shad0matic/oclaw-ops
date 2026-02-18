export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { sql } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const comments = await db.execute(sql`
    SELECT id, task_id, author, message, created_at
    FROM ops.task_comments
    WHERE task_id = ${taskId}
    ORDER BY created_at ASC
  `)

  return NextResponse.json(comments.rows)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const body = await request.json()
  const { message, author = "boss" } = body

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "Message required" }, { status: 400 })
  }

  const result = await db.execute(sql`
    INSERT INTO ops.task_comments (task_id, author, message)
    VALUES (${taskId}, ${author}, ${message.trim()})
    RETURNING id, task_id, author, message, created_at
  `)

  return NextResponse.json(result.rows[0], { status: 201 })
}

// Mark agent comments as read by boss
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const body = await request.json()
  const { reader = "boss" } = body

  // Mark all unread comments from OTHER authors as read
  const result = await db.execute(sql`
    UPDATE ops.task_comments
    SET read_at = NOW(), read_by = ${reader}
    WHERE task_id = ${taskId}
      AND author != ${reader}
      AND read_at IS NULL
    RETURNING id
  `)

  return NextResponse.json({ marked: result.rows.length })
}
