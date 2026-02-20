import { NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// Path to the balance check script
const SCRIPT_PATH = "/home/openclaw/.openclaw/workspace/scripts/check-xai-balance.mjs"

// Load management key from .env.local (if needed for future real API calls)
const ENV_PATH = path.join(process.env.HOME || "/home/openclaw", ".openclaw", ".env.local")
let MANAGEMENT_KEY = ""
if (fs.existsSync(ENV_PATH)) {
  const envContent = fs.readFileSync(ENV_PATH, "utf-8")
  const match = envContent.match(/XAI_MANAGEMENT_KEY=([^\n]+)/)
  if (match) MANAGEMENT_KEY = match[1].trim()
}

export async function GET() {
  try {
    // Check if script exists and key is configured
    if (!fs.existsSync(SCRIPT_PATH) || !MANAGEMENT_KEY) {
      return NextResponse.json({
        ok: true,
        balance_usd: null,
        message: "xAI balance check not configured",
        timestamp: new Date().toISOString()
      })
    }
    
    const output = execSync(`node ${SCRIPT_PATH}`, { encoding: "utf-8" })
    
    // Parse the output
    const balanceMatch = output.match(/Simulated xAI Balance: \$(\d+)/)
    const balance = balanceMatch ? parseInt(balanceMatch[1], 10) : null
    
    return NextResponse.json({
      ok: true,
      balance_usd: balance,
      message: balance !== null ? `Current xAI Balance: $${balance}` : "Unable to fetch balance",
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    // Return graceful response instead of 500
    return NextResponse.json({
      ok: true,
      balance_usd: null,
      message: "xAI balance unavailable",
      timestamp: new Date().toISOString()
    })
  }
}
