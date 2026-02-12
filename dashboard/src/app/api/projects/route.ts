import { pool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/projects — list all projects
export async function GET() {
  const { rows } = await pool.query(
    `SELECT * FROM ops.projects WHERE active = true ORDER BY label`
  )
  return NextResponse.json(rows)
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  const { id, label, icon, description, color } = await request.json()
  if (!id || !label) return NextResponse.json({ error: "id and label required" }, { status: 400 })

  const { rows } = await pool.query(
    `INSERT INTO ops.projects (id, label, icon, description, color)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET label=$2, icon=$3, description=$4, color=$5
     RETURNING *`,
    [id, label, icon || '📦', description || null, color || 'border-l-zinc-500']
  )
  return NextResponse.json(rows[0], { status: 201 })
}

// PATCH /api/projects?id=xxx — update a project
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await request.json()
  const sets: string[] = []
  const params: any[] = [id]

  if (body.label !== undefined) { params.push(body.label); sets.push(`label=$${params.length}`) }
  if (body.icon !== undefined) { params.push(body.icon); sets.push(`icon=$${params.length}`) }
  if (body.description !== undefined) { params.push(body.description); sets.push(`description=$${params.length}`) }
  if (body.color !== undefined) { params.push(body.color); sets.push(`color=$${params.length}`) }
  if (body.active !== undefined) { params.push(body.active); sets.push(`active=$${params.length}`) }

  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 })

  const { rows } = await pool.query(
    `UPDATE ops.projects SET ${sets.join(', ')} WHERE id=$1 RETURNING *`, params
  )
  return NextResponse.json(rows[0])
}

// DELETE /api/projects?id=xxx — soft-delete (deactivate)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await pool.query(`UPDATE ops.projects SET active=false WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
