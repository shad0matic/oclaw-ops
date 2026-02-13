export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { tasksInOps } from "@/lib/schema"
import { desc, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status")

  try {
    let query = db.select().from(tasksInOps).$dynamic()
    if (status) query = query.where(eq(tasksInOps.status, status))
    const tasks = await query.orderBy(desc(tasksInOps.createdAt))
    return NextResponse.json(tasks.map(t => ({ ...t, id: String(t.id) })))
  } catch (error: any) {
    console.error("Failed to fetch tasks", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
