export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import twilio from "twilio"
import { pool } from "@/lib/drizzle"

// POST /api/phone/call — make an outbound call
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { toNumber, message } = body

    if (!toNumber) {
      return NextResponse.json({ success: false, error: "Missing toNumber" }, { status: 400 })
    }

    // Get Twilio credentials from settings
    const { rows: settings } = await pool.query(`
      SELECT 
        phone_number,
        twilio_account_sid,
        twilio_auth_token,
        twilio_api_key,
        twilio_api_secret
      FROM ops.phone_settings
      LIMIT 1
    `)

    if (!settings[0]?.twilio_account_sid || !settings[0]?.twilio_auth_token) {
      return NextResponse.json({ 
        success: false, 
        error: "Twilio not configured. Please configure your Twilio credentials in Settings." 
      }, { status: 400 })
    }

    const { phone_number: fromNumber, twilio_account_sid: accountSid, twilio_auth_token: authToken } = settings[0]

    if (!fromNumber) {
      return NextResponse.json({ 
        success: false, 
        error: "No phone number configured. Please set your Twilio phone number in Settings." 
      }, { status: 400 })
    }

    // Create Twilio client
    const client = twilio(accountSid, authToken)

    // Get the base URL for the webhook
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"

    // Make the outbound call
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      url: `${baseUrl}/api/phone/webhook/twiml?message=${encodeURIComponent(message || "This is an urgent call from OpenClaw.")}`,
      statusCallback: `${baseUrl}/api/phone/webhook/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    })

    console.log("Outbound call initiated:", call.sid)

    // Log the call in database
    await pool.query(`
      INSERT INTO ops.phone_calls (
        from_number, to_number, direction, status, session_key
      ) VALUES ($1, $2, 'outbound', 'pending', $3)
    `, [fromNumber, toNumber, call.sid])

    return NextResponse.json({ 
      success: true, 
      callSid: call.sid,
      status: call.status
    })
  } catch (error) {
    console.error("Outbound call error:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}
