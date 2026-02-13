export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await req.json()
        const { resolved, lesson_learned } = body

        const updates = []
        const values = [id]

        if (resolved !== undefined) {
            updates.push(`resolved = $${values.length + 1}`)
            values.push(resolved)
        }
        if (lesson_learned) {
            updates.push(`lesson_learned = $${values.length + 1}`)
            values.push(lesson_learned)
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 })
        }

        const query = `
            UPDATE ops.mistakes
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING *
        `

        const updatedResult = await pool.query(query, values)
        const updated = updatedResult.rows[0]

        return NextResponse.json({
            ...updated,
            id: updated.id.toString()
        })
    } catch (error) {
        console.error("Failed to update mistake", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
