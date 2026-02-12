export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const workflowId = searchParams.get("workflow_id")

    try {
        const where: Prisma.runsWhereInput = {}
        if (status) where.status = status
        if (workflowId) where.workflow_id = parseInt(workflowId)

        const runs = await prisma.runs.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: limit,
            include: {
                workflows: {
                    select: { name: true }
                }
            }
        })

        return NextResponse.json(runs)
    } catch (error) {
        console.error("Failed to fetch runs", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
