export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { runsInOps, workflowsInOps } from "@/lib/schema"
import { desc, eq, and, SQL } from "drizzle-orm"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "20")
  const status = searchParams.get("status")
  const workflowId = searchParams.get("workflow_id")

  try {
    const conditions: SQL[] = []
    if (status) conditions.push(eq(runsInOps.status, status))
    if (workflowId) conditions.push(eq(runsInOps.workflowId, parseInt(workflowId)))

    const rows = await db.select({
      run: runsInOps,
      workflowName: workflowsInOps.name,
    })
      .from(runsInOps)
      .leftJoin(workflowsInOps, eq(runsInOps.workflowId, workflowsInOps.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(runsInOps.createdAt))
      .limit(limit)

    const runs = rows.map(({ run, workflowName }) => ({
      ...run,
      id: String(run.id),
      workflow_id: String(run.workflowId),
      workflows: { name: workflowName },
    }))

    return NextResponse.json(runs)
  } catch (error) {
    console.error("Failed to fetch runs", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
