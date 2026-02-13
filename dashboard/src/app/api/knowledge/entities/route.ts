export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { entitiesInMemory } from "@/lib/schema"
import { desc, eq } from "drizzle-orm"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entity_type")

  try {
    let query = db.select().from(entitiesInMemory).$dynamic()
    if (entityType) query = query.where(eq(entitiesInMemory.entityType, entityType))
    const entities = await query.orderBy(desc(entitiesInMemory.createdAt)).limit(100)
    return NextResponse.json(entities.map(e => ({ ...e, id: String(e.id) })))
  } catch (error) {
    console.error("Failed to fetch entities", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, entity_type, aliases, properties, first_seen_by } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const [entity] = await db.insert(entitiesInMemory).values({
      name,
      entityType: entity_type || "unknown",
      aliases: aliases || [],
      properties: properties || {},
      firstSeenBy: first_seen_by,
    }).returning()

    return NextResponse.json({ ...entity, id: String(entity.id) })
  } catch (error) {
    console.error("Failed to create entity", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
