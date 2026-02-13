export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { AgentEntity } from "@/entities/agent"
import fs from "fs"
import path from "path"

const AVATAR_DIR = path.join(process.cwd(), "public", "assets", "minion-avatars")

function resolveAvatarUrl(agentId: string): string {
  const filePath = path.join(AVATAR_DIR, `${agentId}.webp`)
  if (fs.existsSync(filePath)) {
    return `/assets/minion-avatars/${agentId}.webp`
  }
  return AgentEntity.defaultAvatarUrl()
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
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
      const entity = AgentEntity.fromRow({
        ...r,
        avatarUrl: resolveAvatarUrl(r.agent_id),
        status: (r.active_count || 0) > 0 ? 'active' : 'idle',
      })
      return entity.toJSON()
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error("Agent registry error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
