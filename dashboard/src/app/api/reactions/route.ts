export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { reactionsInOps } from "@/lib/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const rows = await db.select().from(reactionsInOps).orderBy(desc(reactionsInOps.createdAt))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch reactions", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trigger_agent, trigger_event, responder_agent, action, trigger_filter, action_params, probability, enabled } = body

    if (!trigger_agent || !trigger_event || !responder_agent || !action) {
      return NextResponse.json(
        { error: "trigger_agent, trigger_event, responder_agent, and action are required" },
        { status: 400 }
      )
    }

    const [reaction] = await db.insert(reactionsInOps).values({
      triggerAgent: trigger_agent,
      triggerEvent: trigger_event,
      triggerFilter: trigger_filter || {},
      responderAgent: responder_agent,
      action,
      actionParams: action_params || {},
      probability: String(probability || 1.0),
      enabled: enabled !== false,
    }).returning()

    return NextResponse.json(reaction)
  } catch (error) {
    console.error("Failed to create reaction", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
