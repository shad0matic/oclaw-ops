export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"
import fs from "fs"
import path from "path"

// Agent metadata not stored in DB (static config)
const AGENT_META: Record<string, { emoji: string; role: string }> = {
  main:    { emoji: "🍌", role: "Lead" },
  bob:     { emoji: "🎨", role: "UI/Frontend" },
  nefario: { emoji: "🔬", role: "Research" },
  xreader: { emoji: "📰", role: "X/Twitter" },
  stuart:  { emoji: "🔒", role: "DB/Schema" },
  mel:     { emoji: "🚔", role: "Security" },
  dave:    { emoji: "💰", role: "Cost Watch" },
}

const AVATAR_DIR = path.join(process.cwd(), "public", "assets", "minion-avatars")

function getAvatarUrl(agentId: string): string {
  const filePath = path.join(AVATAR_DIR, `${agentId}.webp`)
  if (fs.existsSync(filePath)) {
    return `/assets/minion-avatars/${agentId}.webp`
  }
  return `/assets/minion-avatars/default.webp`
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Agent profiles + live session status in one query
    const { rows } = await pool.query(`
      SELECT
        p.agent_id,
        p.name,
        p.description,
        p.level,
        p.trust_score,
        p.total_tasks,
        p.successful_tasks,
        ls.active_count,
        ls.current_label,
        ls.current_model
      FROM memory.agent_profiles p
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE is_active)::int as active_count,
          (SELECT label FROM ops.live_sessions ls2
           WHERE ls2.agent_id = p.agent_id AND ls2.is_active = true
           ORDER BY ls2.updated_at DESC LIMIT 1) as current_label,
          (SELECT model FROM ops.live_sessions ls3
           WHERE ls3.agent_id = p.agent_id AND ls3.is_active = true
           ORDER BY ls3.updated_at DESC LIMIT 1) as current_model
        FROM ops.live_sessions ls
        WHERE ls.agent_id = p.agent_id
      ) ls ON true
      ORDER BY p.agent_id ASC
    `)

    const agents = rows.map((r: any) => {
      const meta = AGENT_META[r.agent_id] || { emoji: "🤖", role: "Agent" }
      const hasActive = (r.active_count || 0) > 0

      return {
        id: r.agent_id,
        name: r.name,
        emoji: meta.emoji,
        role: meta.role,
        description: r.description || "",
        level: r.level || 1,
        trustScore: Number(r.trust_score) || 0.5,
        totalTasks: r.total_tasks || 0,
        successfulTasks: r.successful_tasks || 0,
        avatarUrl: getAvatarUrl(r.agent_id),
        status: hasActive ? "active" : "idle",
        currentTask: r.current_label || null,
        currentModel: r.current_model || null,
      }
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error("Agent registry error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
