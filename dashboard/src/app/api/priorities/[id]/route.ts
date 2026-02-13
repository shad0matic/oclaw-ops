export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { prioritiesInOps } from "@/lib/schema"
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
    const values: Partial<typeof prioritiesInOps.$inferInsert> = {}

    if (body.priority !== undefined) values.priority = body.priority
    if (body.resolved !== undefined) values.resolvedAt = body.resolved ? new Date().toISOString() : null

    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db.update(prioritiesInOps)
      .set(values)
      .where(eq(prioritiesInOps.id, BigInt(id!)))
      .returning()

    return NextResponse.json({ ...updated, id: String(updated.id) })
  } catch (error) {
    console.error("Failed to update priority", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
