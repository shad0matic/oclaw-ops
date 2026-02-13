export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { compoundsInMemory } from "@/lib/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const compounds = await db.select().from(compoundsInMemory)
      .orderBy(desc(compoundsInMemory.periodStart))
      .limit(50)
    return NextResponse.json(compounds.map(c => ({ ...c, id: String(c.id) })))
  } catch (error) {
    console.error("Failed to fetch compounds", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
