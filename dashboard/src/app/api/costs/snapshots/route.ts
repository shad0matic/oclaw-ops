export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { costSnapshotsInOps } from "@/lib/schema"
import { desc, gte } from "drizzle-orm"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "30")

  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const snapshots = await db.select().from(costSnapshotsInOps)
      .where(gte(costSnapshotsInOps.snapshotHour, since.toISOString()))
      .orderBy(desc(costSnapshotsInOps.snapshotHour))
      .limit(days * 24)

    return NextResponse.json(snapshots.map(s => ({
      ...s,
      id: String(s.id),
    })))
  } catch (error) {
    console.error("Failed to fetch cost snapshots", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
