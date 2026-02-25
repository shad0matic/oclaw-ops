export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// Twilio webhook for call recording completion
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get("CallSid") as string
    const recordingUrl = formData.get("RecordingUrl") as string
    const duration = formData.get("RecordingDuration") as string
    const callId = formData.get("callId") // From our custom URL param
    
    console.log("Recording completed for call:", callSid, "duration:", duration)
    
    // Update the call record with recording info
    if (callId) {
      await pool.query(`
        UPDATE ops.phone_calls SET
          recording_url = $1,
          duration = $2,
          status = 'completed',
          ended_at = NOW()
        WHERE id = $3
      `, [recordingUrl, parseInt(duration) || 0, callId])
    }
    
    // Return empty TwiML
    return new NextResponse("", {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("Recording webhook error:", error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" }
    })
  }
}
