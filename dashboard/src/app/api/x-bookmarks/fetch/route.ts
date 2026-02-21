import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"
export const maxDuration = 120 // Allow up to 2 minutes for sync

// POST: Trigger X bookmark fetch directly via sync script
export async function POST(request: Request) {
  try {
    // Parse optional count from request body
    let count = 200 // default
    try {
      const body = await request.json()
      if (body.count && typeof body.count === "number") {
        count = Math.min(Math.max(body.count, 10), 1000) // clamp 10-1000
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Path to the sync script
    const scriptPath = "/home/openclaw/projects/oclaw-ops/scripts/sync-x-bookmarks.py"
    
    // Source the X auth and run the sync script
    const command = `
      source /home/openclaw/.openclaw/workspace-phil/.pi/x_auth.sh && \
      python3 ${scriptPath} ${count}
    `

    console.log(`[x-bookmarks/fetch] Running sync with count=${count}`)

    const { stdout, stderr } = await execAsync(command, {
      shell: "/bin/bash",
      timeout: 110000, // 110 seconds (leave buffer for response)
      env: {
        ...process.env,
        PATH: `/home/openclaw/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      }
    })

    // Parse results from stderr (script outputs to stderr for logging)
    const output = stderr || stdout
    
    // Extract counts from output
    const fetchedMatch = output.match(/Fetched:\s*(\d+)/i)
    const totalMatch = output.match(/Total in DB:\s*(\d+)/i)
    
    const fetched = fetchedMatch ? parseInt(fetchedMatch[1], 10) : 0
    const totalInDb = totalMatch ? parseInt(totalMatch[1], 10) : 0

    console.log(`[x-bookmarks/fetch] Sync complete: fetched=${fetched}, total=${totalInDb}`)

    return NextResponse.json({ 
      success: true,
      fetched,
      totalInDb,
      message: `Synced ${fetched} bookmarks. Total in DB: ${totalInDb}`
    })

  } catch (error: any) {
    console.error("[x-bookmarks/fetch] Sync failed:", error)
    
    // Check for specific errors
    if (error.message?.includes("timeout")) {
      return NextResponse.json({ 
        error: "Sync timed out. X may be slow or rate limiting.",
        details: error.stderr || error.message 
      }, { status: 504 })
    }

    return NextResponse.json({ 
      error: "Bookmark sync failed",
      details: error.stderr || error.message 
    }, { status: 500 })
  }
}
