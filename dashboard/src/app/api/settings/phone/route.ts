export const dynamic = "force-dynamic"

import { pool } from "@/lib/drizzle"
import { NextResponse } from "next/server"

// GET /api/settings/phone — returns phone settings
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        phone_number as "phoneNumber",
        twilio_account_sid as "twilioAccountSid",
        twilio_api_key as "twilioApiKey",
        boss_phone_number as "bossPhoneNumber",
        voicemail_greeting as "voicemailGreeting",
        enabled,
        voice_enabled as "voiceEnabled",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ops.phone_settings
      ORDER BY id DESC
      LIMIT 1
    `)

    // Don't return auth token or secrets
    const settings = rows[0] || {
      phoneNumber: "",
      twilioAccountSid: "",
      twilioApiKey: "",
      bossPhoneNumber: "",
      voicemailGreeting: "Hello, this is OpenClaw. Please leave a message.",
      enabled: false,
      voiceEnabled: true,
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Phone settings error:", error)
    return NextResponse.json({ settings: null }, { status: 500 })
  }
}

// POST /api/settings/phone — save phone settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      phoneNumber,
      twilioAccountSid,
      twilioAuthToken,
      twilioApiKey,
      twilioApiSecret,
      bossPhoneNumber,
      voicemailGreeting,
      enabled,
      voiceEnabled,
    } = body

    // Check if settings exist
    const { rows: existing } = await pool.query(`
      SELECT id FROM ops.phone_settings ORDER BY id DESC LIMIT 1
    `)

    let result
    if (existing.length > 0) {
      // Update existing
      result = await pool.query(`
        UPDATE ops.phone_settings SET
          phone_number = $1,
          twilio_account_sid = $2,
          twilio_auth_token = $3,
          twilio_api_key = $4,
          twilio_api_secret = $5,
          boss_phone_number = $6,
          voicemail_greeting = $7,
          enabled = $8,
          voice_enabled = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING id
      `, [
        phoneNumber,
        twilioAccountSid,
        twilioAuthToken,
        twilioApiKey,
        twilioApiSecret,
        bossPhoneNumber,
        voicemailGreeting,
        enabled,
        voiceEnabled,
        existing[0].id
      ])
    } else {
      // Insert new
      result = await pool.query(`
        INSERT INTO ops.phone_settings (
          phone_number, twilio_account_sid, twilio_auth_token,
          twilio_api_key, twilio_api_secret, boss_phone_number,
          voicemail_greeting, enabled, voice_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        phoneNumber,
        twilioAccountSid,
        twilioAuthToken,
        twilioApiKey,
        twilioApiSecret,
        bossPhoneNumber,
        voicemailGreeting,
        enabled,
        voiceEnabled,
      ])
    }

    return NextResponse.json({ success: true, id: result.rows[0]?.id })
  } catch (error) {
    console.error("Phone settings save error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
