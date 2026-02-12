export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const workflows = await prisma.workflows.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { runs: true }
                }
            }
        })

        // Enrich with latest run info
        const enrichedWorkflows = await Promise.all(workflows.map(async (wf) => {
            const latestRun = await prisma.runs.findFirst({
                where: { workflow_id: wf.id },
                orderBy: { created_at: 'desc' },
                select: {
                    status: true,
                    created_at: true
                }
            })

            return {
                ...wf,
                total_runs: wf._count.runs,
                last_run_status: latestRun?.status,
                last_run_at: latestRun?.created_at
            }
        }))

        return NextResponse.json(enrichedWorkflows)
    } catch (error) {
        console.error("Failed to fetch workflows", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
