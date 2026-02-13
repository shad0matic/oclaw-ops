export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const subscriptionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    provider: z.string().optional(),
    monthly_price: z.number().min(0, "Price must be a positive number"),
    currency: z.enum(["EUR", "USD"]).default("EUR"),
    renewal_day: z.number().int().min(1).max(31).default(1),
    used_in_openclaw: z.boolean().default(false),
    notes: z.string().optional(),
    active: z.boolean().default(true)
})

export async function GET(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const subscriptions = await prisma.subscriptions.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(subscriptions)
    } catch (error) {
        console.error("Failed to fetch subscriptions", error)
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
        const parsedData = subscriptionSchema.parse(body)

        const subscription = await prisma.subscriptions.create({
            data: parsedData
        })

        return NextResponse.json(subscription)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }
        console.error("Failed to create subscription", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: "id query param is required" }, { status: 400 })
    }

    try {
        const body = await req.json()
        const parsedData = subscriptionSchema.partial().parse(body)

        const subscription = await prisma.subscriptions.update({
            where: { id: parseInt(id) },
            data: parsedData
        })

        return NextResponse.json(subscription)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }
        console.error("Failed to update subscription", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: "id query param is required" }, { status: 400 })
    }

    try {
        const subscription = await prisma.subscriptions.update({
            where: { id: parseInt(id) },
            data: { active: false }
        })

        return NextResponse.json(subscription)
    } catch (error) {
        console.error("Failed to delete subscription", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
