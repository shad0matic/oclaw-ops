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

        const updated = await prisma.reactions.update({
            where: { id: parseInt(id) },
            data: body
        })

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
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        await prisma.reactions.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete reaction", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
