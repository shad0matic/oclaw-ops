export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"

// Generate TwiML for outbound calls
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const message = searchParams.get("message") || "This is an urgent call from OpenClaw."
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">${message}</Say>
  <Pause length="2"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">Thank you for your attention. Goodbye.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" }
  })
}
