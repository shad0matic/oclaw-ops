import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function POST(
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
        const { task, context } = body

        // Validate workflow exists
        const workflow = await prisma.workflows.findUnique({
            where: { id: parseInt(id) }
        })

        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
        }

        if (!workflow.enabled) {
            return NextResponse.json(
                { error: "Workflow is disabled" },
                { status: 400 }
            )
        }

        // Create a new run
        const run = await prisma.runs.create({
            data: {
                workflow_id: workflow.id,
                workflow_name: workflow.name,
                task: task || "Manual trigger from dashboard",
                status: "pending",
                triggered_by: session.user?.email || "manual",
                context: context || {},
                result: {}
            }
        })

        return NextResponse.json(run)
    } catch (error) {
        console.error("Failed to trigger workflow run", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
