export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

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
        const { priority, resolved } = body

        const data: any = {}
        if (priority !== undefined) data.priority = priority
        if (resolved !== undefined) {
            data.resolved_at = resolved ? new Date() : null
        }

        const updated = await prisma.priorities.update({
            where: { id: BigInt(id) },
            data
        })

        return NextResponse.json({
            ...updated,
            id: updated.id.toString()
        })
    } catch (error) {
        console.error("Failed to update priority", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
