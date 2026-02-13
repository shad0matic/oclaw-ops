export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { parseNumericId } from "@/lib/validate"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id: rawId } = await params
    const [id, idErr] = parseNumericId(rawId)
    if (idErr) return idErr

    try {
        const body = await req.json()
        
        const updates = Object.keys(body).map((key, i) => `${key} = $${i + 2}`)
        const values = [id, ...Object.values(body)]

        const query = `
            UPDATE ops.reactions
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING *
        `

        const updatedResult = await pool.query(query, values)
        const updated = updatedResult.rows[0]

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update reaction", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id: rawId } = await params
    const [id, idErr] = parseNumericId(rawId)
    if (idErr) return idErr

    try {
        await pool.query(`DELETE FROM ops.reactions WHERE id = $1`, [id])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete reaction", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
