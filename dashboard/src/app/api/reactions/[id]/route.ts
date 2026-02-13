export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { reactionsInOps } from "@/lib/schema"
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

    // Map snake_case keys from frontend to camelCase Drizzle columns
    const colMap: Record<string, keyof typeof reactionsInOps.$inferInsert> = {
      trigger_agent: 'triggerAgent',
      trigger_event: 'triggerEvent',
      trigger_filter: 'triggerFilter',
      responder_agent: 'responderAgent',
      action: 'action',
      action_params: 'actionParams',
      probability: 'probability',
      enabled: 'enabled',
    }

    const values: Partial<typeof reactionsInOps.$inferInsert> = {}
    for (const [k, v] of Object.entries(body)) {
      const col = colMap[k] || k
      ;(values as any)[col] = v
    }

    const [updated] = await db.update(reactionsInOps)
      .set(values)
      .where(eq(reactionsInOps.id, id!))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update reaction", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseNumericId(rawId)
  if (idErr) return idErr

  try {
    await db.delete(reactionsInOps).where(eq(reactionsInOps.id, id!))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete reaction", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
