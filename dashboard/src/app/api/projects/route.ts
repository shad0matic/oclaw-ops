export const dynamic = "force-dynamic"
import { db } from "@/lib/drizzle"
import { projectsInOps } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const rows = await db.select().from(projectsInOps)
    .where(eq(projectsInOps.active, true))
    .orderBy(projectsInOps.label)
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { id, label, icon, description, color } = await request.json()
  if (!id || !label) return NextResponse.json({ error: "id and label required" }, { status: 400 })

  const [row] = await db.insert(projectsInOps).values({
    id, label,
    icon: icon || '📦',
    description: description || null,
    color: color || 'border-l-zinc-500',
  }).onConflictDoUpdate({
    target: projectsInOps.id,
    set: { label, icon: icon || '📦', description: description || null, color: color || 'border-l-zinc-500' },
  }).returning()
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await request.json()
  const values: Partial<typeof projectsInOps.$inferInsert> = {}
  if (body.label !== undefined) values.label = body.label
  if (body.icon !== undefined) values.icon = body.icon
  if (body.description !== undefined) values.description = body.description
  if (body.color !== undefined) values.color = body.color
  if (body.active !== undefined) values.active = body.active

  if (Object.keys(values).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 })

  const [row] = await db.update(projectsInOps).set(values).where(eq(projectsInOps.id, id)).returning()
  return NextResponse.json(row)
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await db.update(projectsInOps).set({ active: false }).where(eq(projectsInOps.id, id))
  return NextResponse.json({ ok: true })
}
