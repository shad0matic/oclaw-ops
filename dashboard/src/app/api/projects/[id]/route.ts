
import { db } from "@/lib/drizzle"
import { NextRequest, NextResponse } from "next/server"
import { projectsInOps, taskQueueInOps } from "@/lib/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

// GET a single project with its tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
  }

  try {
    const project = await db
      .select()
      .from(projectsInOps)
      .where(eq(projectsInOps.id, id))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const tasks = await db
      .select()
      .from(taskQueueInOps)
      .where(eq(taskQueueInOps.project, id))
      .orderBy(taskQueueInOps.createdAt)

    return NextResponse.json({ ...project[0], tasks })
  } catch (error: any) {
    console.error(`Failed to fetch project ${id}`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH to update a project's fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { label, description, icon, acronym, color, active, owner, status } = body

    const updatedFields: Partial<typeof projectsInOps.$inferInsert> = {}
    if (label) updatedFields.label = label
    if (description !== undefined) updatedFields.description = description
    if (icon) updatedFields.icon = icon
    if (acronym !== undefined) (updatedFields as any).acronym = acronym
    if (color) updatedFields.color = color
    if (active !== undefined) updatedFields.active = active
    if (owner !== undefined) (updatedFields as any).owner = owner
    if (status !== undefined) (updatedFields as any).status = status

    if (Object.keys(updatedFields).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    const result = await db
      .update(projectsInOps)
      .set(updatedFields)
      .where(eq(projectsInOps.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error(`Failed to update project ${id}`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
