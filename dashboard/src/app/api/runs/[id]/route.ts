export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        const run = await prisma.runs.findUnique({
            where: { id: BigInt(id) },
            include: {
                workflows: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                steps: {
                    orderBy: { step_order: 'asc' }
                }
            }
        })

        if (!run) {
            return NextResponse.json({ error: "Run not found" }, { status: 404 })
        }

        // Convert BigInt to string for JSON serialization
        const serializedRun = {
            ...run,
            id: run.id.toString(),
            steps: run.steps.map(step => ({
                ...step,
                id: step.id.toString(),
                run_id: step.run_id.toString()
            }))
        }

        return NextResponse.json(serializedRun)
    } catch (error) {
        console.error("Failed to fetch run", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
