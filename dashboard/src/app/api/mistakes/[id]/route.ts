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
        const { resolved, lesson_learned } = body

        const data: any = {}
        if (resolved !== undefined) data.resolved = resolved
        if (lesson_learned) data.lesson_learned = lesson_learned

        const updated = await prisma.mistakes.update({
            where: { id: BigInt(id) },
            data
        })

        return NextResponse.json({
            ...updated,
            id: updated.id.toString()
        })
    } catch (error) {
        console.error("Failed to update mistake", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
