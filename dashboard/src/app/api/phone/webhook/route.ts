export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// Twilio webhook for incoming calls and SMS
// This endpoint handles both voice calls and SMS messages from Twilio
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get("CallSid") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    const messageSid = formData.get("MessageSid") as string
    const body = formData.get("Body") as string
    const callStatus = formData.get("CallStatus") as string
    const recordingUrl = formData.get("RecordingUrl") as string
    const transcription = formData.get("TranscriptionText") as string
    
    // Determine if this is an SMS or Voice call
    const isSms = !!messageSid || !!body
    
    if (isSms) {
      // Handle incoming SMS
      console.log("Incoming SMS from:", from, "body:", body)
      
      // TODO: Process SMS - integrate with agent system
      // For now, just log it and return a response
      
      // Store in database
      await pool.query(`
        INSERT INTO ops.phone_calls (
          from_number, to_number, direction, status, transcription
        ) VALUES ($1, $2, 'inbound', 'completed', $3)
      `, [from, to, body])
      
      // Return TwiML response for SMS (empty - we don't auto-reply via TwiML for SMS)
      return new NextResponse("", {
        headers: { "Content-Type": "text/xml" }
      })
    }
    
    // Handle incoming voice call
    console.log("Incoming call from:", from, "status:", callStatus)
    
    // Store call in database
    const { rows } = await pool.query(`
      INSERT INTO ops.phone_calls (
        from_number, to_number, direction, status, recording_url
      ) VALUES ($1, $2, 'inbound', $3, $4)
      RETURNING id
    `, [from, to, callStatus || 'pending', recordingUrl])
    
    const callId = rows[0]?.id
    
    // Get voicemail greeting from settings
    let voicemailGreeting = "Hello, this is OpenClaw. Please leave a message."
    try {
      const { rows: settings } = await pool.query(`
        SELECT voicemail_greeting FROM ops.phone_settings LIMIT 1
      `)
      if (settings[0]?.voicemail_greeting) {
        voicemailGreeting = settings[0].voicemail_greeting
      }
    } catch (e) {
      console.error("Failed to get voicemail greeting:", e)
    }
    
    // Return TwiML to handle the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">${voicemailGreeting}</Say>
  <Record 
    action="/api/phone/webhook/recording?callId=${callId}" 
    maxLength="300" 
    transcribe="true" 
    transcriptionCallback="/api/phone/webhook/transcription?callId=${callId}"
  />
  <Hangup/>
</Response>`
    
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("Twilio webhook error:", error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', {
      headers: { "Content-Type": "text/xml" }
    })
  }
}

// GET endpoint for Twilio to verify the webhook
export async function GET() {
  return new NextResponse("Twilio webhook active", { status: 200 })
}
