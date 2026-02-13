export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { mistakesInMemory } from "@/lib/schema"
import { desc, eq, and, SQL } from "drizzle-orm"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agent_id")
  const includeResolved = searchParams.get("include_resolved") === "true"

  try {
    const conditions: SQL[] = []
    if (agentId) conditions.push(eq(mistakesInMemory.agentId, agentId))
    if (!includeResolved) conditions.push(eq(mistakesInMemory.resolved, false))

    const mistakes = await db.select().from(mistakesInMemory)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(mistakesInMemory.severity), desc(mistakesInMemory.lastOccurredAt))

    return NextResponse.json(mistakes.map(m => ({ ...m, id: String(m.id) })))
  } catch (error) {
    console.error("Failed to fetch mistakes", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agent_id, description, context, lesson_learned, severity } = body

    if (!agent_id || !description) {
      return NextResponse.json({ error: "agent_id and description are required" }, { status: 400 })
    }

    const [mistake] = await db.insert(mistakesInMemory).values({
      agentId: agent_id,
      description,
      context,
      lessonLearned: lesson_learned,
      severity: severity || 3,
      recurrenceCount: 1,
      resolved: false,
    }).returning()

    return NextResponse.json({ ...mistake, id: String(mistake.id) })
  } catch (error) {
    console.error("Failed to create mistake", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
