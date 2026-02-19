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
    // For now, simulate balance check since exact endpoint isn't confirmed
    // In a real scenario, this would make an API call to xAI management API
    // Using a placeholder script execution
    const output = execSync(`node ${SCRIPT_PATH}`, { encoding: "utf-8" })
    
    // Parse the output (assuming script logs balance in a specific format)
    // This is a placeholder; adjust based on actual script output
    const balanceMatch = output.match(/Simulated xAI Balance: \$(\d+)/)
    const balance = balanceMatch ? parseInt(balanceMatch[1], 10) : -1
    const message = balance >= 0 ? `Current xAI Balance: $${balance}` : "Unable to fetch balance"
    
    return NextResponse.json({
      ok: true,
      balance: balance >= 0 ? balance : null,
      message,
      timestamp: new Date().toISOString(),
      rawOutput: output
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message || "Failed to check xAI balance"
    }, { status: 500 })
  }
}
