export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { mistakesInMemory } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { parseNumericId } from "@/lib/validate"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseNumericId(rawId)
  if (idErr) return idErr

  try {
    const body = await req.json()
    const values: Partial<typeof mistakesInMemory.$inferInsert> = {}

    if (body.resolved !== undefined) values.resolved = body.resolved
    if (body.lesson_learned) values.lessonLearned = body.lesson_learned

    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db.update(mistakesInMemory)
      .set(values)
      .where(eq(mistakesInMemory.id, BigInt(id!)))
      .returning()

    return NextResponse.json({ ...updated, id: String(updated.id) })
  } catch (error) {
    console.error("Failed to update mistake", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
