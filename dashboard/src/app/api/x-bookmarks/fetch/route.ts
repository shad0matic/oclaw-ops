import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

// POST: Trigger X bookmark fetch via cron wake event
export async function POST() {
  try {
    // Insert a wake event to trigger the bookmark sync
    // This assumes there's a cron job listening for this, or we can call the OpenClaw API directly
    
    // For now, we'll make an HTTP request to the OpenClaw gateway to trigger a bookmark fetch
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN
    
    if (!gatewayToken) {
      return NextResponse.json({ error: "Gateway token not configured" }, { status: 500 })
    }

    // Send a wake event to trigger bookmark fetch
    const response = await fetch(`${gatewayUrl}/api/cron/wake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gatewayToken}`
      },
      body: JSON.stringify({
        text: "User requested manual X bookmark sync from MC dashboard. Please fetch latest bookmarks.",
        mode: "now"
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `Gateway error: ${error}` }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Bookmark fetch triggered. Check back in a moment for new bookmarks."
    })
  } catch (error: any) {
    console.error("Failed to trigger bookmark fetch:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
