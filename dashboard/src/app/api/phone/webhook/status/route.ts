export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// Twilio webhook for call status updates
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get("CallSid") as string
    const callStatus = formData.get("CallStatus") as string
    const callDuration = formData.get("CallDuration") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    
    console.log("Call status update:", callSid, "status:", callStatus, "duration:", callDuration)
    
    // Map Twilio status to our status
    let status = callStatus
    if (callStatus === "completed") {
      status = "completed"
    } else if (callStatus === "answered") {
      status = "answered"
    } else if (callStatus === "ringing") {
      status = "ringing"
    } else if (callStatus === "in-progress") {
      status = "in-progress"
    } else if (callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "canceled") {
      status = "failed"
    }
    
    // Update the call record
    if (callSid) {
      await pool.query(`
        UPDATE ops.phone_calls SET
          status = $1,
          duration = COALESCE($2, duration),
          ended_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE ended_at END
        WHERE session_key = $4 OR from_number = $5 OR to_number = $6
        ORDER BY created_at DESC
        LIMIT 1
      `, [status, callDuration ? parseInt(callDuration) : null, callStatus, callSid, from, to])
    }
    
    return new NextResponse("", {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("Status webhook error:", error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" }
    })
  }
}

// GET endpoint for verification
export async function GET() {
  return new NextResponse("Twilio status webhook active", { status: 200 })
}
