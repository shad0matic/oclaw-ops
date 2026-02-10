import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const reactions = await prisma.reactions.findMany({
            orderBy: { created_at: 'desc' }
        })

        return NextResponse.json(reactions)
    } catch (error) {
        console.error("Failed to fetch reactions", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { trigger_agent, trigger_event, responder_agent, action, trigger_filter, action_params, probability, enabled } = body

        if (!trigger_agent || !trigger_event || !responder_agent || !action) {
            return NextResponse.json(
                { error: "trigger_agent, trigger_event, responder_agent, and action are required" },
                { status: 400 }
            )
        }

        const reaction = await prisma.reactions.create({
            data: {
                trigger_agent,
                trigger_event,
                trigger_filter: trigger_filter || {},
                responder_agent,
                action,
                action_params: action_params || {},
                probability: probability || 1.0,
                enabled: enabled !== false
            }
        })

        return NextResponse.json(reaction)
    } catch (error) {
        console.error("Failed to create reaction", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
