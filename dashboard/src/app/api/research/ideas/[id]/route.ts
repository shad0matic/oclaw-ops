export const dynamic = "force-dynamic"
import { db } from '@/lib/drizzle'
import { researchIdeasInOps } from '@/lib/schema'
import { eq, sql } from 'drizzle-orm'
import { parseNumericId } from "@/lib/validate"
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const [id, idErr] = parseNumericId(rawId)
  if (idErr) return idErr

  const { status } = await req.json()
  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const [updated] = await db.update(researchIdeasInOps)
    .set({ status, updatedAt: sql`NOW()` })
    .where(eq(researchIdeasInOps.id, id!))
    .returning()

  return NextResponse.json(updated)
}
