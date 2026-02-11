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
            include: {
                agent_profile: {
                    select: {
                        name: true,
                    },
                },
            },
        })

        const formattedTasks = tasks.map(task => ({
            ...task,
            agent: task.agent_profile ? { name: task.agent_profile.name } : null,
            agent_profile: undefined, // remove redundant nested object
        }))

        return NextResponse.json(formattedTasks)
    } catch (error: any) {
        console.error("Failed to fetch tasks", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
