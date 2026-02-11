import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const SCRIPT = "/home/shad/.openclaw/workspace/scripts/memory-integrity-check.mjs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const quick = searchParams.get("quick") === "true"

  try {
    const args = quick ? "--quick" : ""
    const { stdout, stderr } = await execAsync(`node ${SCRIPT} ${args}`, {
      timeout: 30000,
      env: { ...process.env, WORKSPACE: "/home/shad/.openclaw/workspace" },
    })

    if (stderr) {
      return NextResponse.json({ ok: false, error: stderr.trim() }, { status: 500 })
    }

    const report = JSON.parse(stdout)
    return NextResponse.json({ ok: true, ...report })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Integrity check failed" },
      { status: 500 }
    )
  }
}

// POST triggers a sync + recheck
export async function POST() {
  try {
    const SYNC = "/home/shad/.openclaw/workspace/scripts/memory-sync.mjs"
    await execAsync(`node ${SYNC}`, {
      timeout: 120000,
      env: { ...process.env, WORKSPACE: "/home/shad/.openclaw/workspace" },
    })

    const { stdout } = await execAsync(`node ${SCRIPT}`, {
      timeout: 30000,
      env: { ...process.env, WORKSPACE: "/home/shad/.openclaw/workspace" },
    })

    const report = JSON.parse(stdout)
    return NextResponse.json({ ok: true, synced: true, ...report })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Sync failed" },
      { status: 500 }
    )
  }
}
