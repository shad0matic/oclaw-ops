export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params

    try {
        const body = await req.json()
        const { priority, resolved } = body

        const updates: string[] = []
        const values: any[] = [id]

        if (priority !== undefined) {
            updates.push(`priority = $${values.length + 1}`)
            values.push(priority)
        }
        if (resolved !== undefined) {
            updates.push(`resolved_at = $${values.length + 1}`)
            values.push(resolved ? new Date() : null)
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 })
        }

        const query = `
            UPDATE ops.priorities
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
        console.error("Failed to update priority", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
