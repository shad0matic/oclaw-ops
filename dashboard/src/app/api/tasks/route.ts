export const dynamic = "force-dynamic"
import prisma from "@/lib/db"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

// GET /api/tasks?status=in_progress
export async function GET(request: NextRequest) {
    const status = request.nextUrl.searchParams.get("status")

    try {
        const tasks = await prisma.tasks.findMany({
            where: status ? { status } : {},
            orderBy: { created_at: 'desc' },
        })

        return NextResponse.json(tasks)
    } catch (error: any) {
        console.error("Failed to fetch tasks", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
