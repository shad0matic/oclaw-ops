export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// Twilio webhook for transcription completion
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get("CallSid") as string
    const transcriptionText = formData.get("TranscriptionText") as string
    const callId = formData.get("callId") // From our custom URL param
    
    console.log("Transcription completed for call:", callSid)
    console.log("Transcription:", transcriptionText)
    
    // Update the call record with transcription
    if (callId && transcriptionText) {
      await pool.query(`
        UPDATE ops.phone_calls SET
          transcription = $1
        WHERE id = $2
      `, [transcriptionText, callId])
      
      // TODO: Send transcription to agent for processing
      // This could trigger an agent to respond or take action
    }
    
    // Return empty TwiML
    return new NextResponse("", {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("Transcription webhook error:", error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" }
    })
  }
}
