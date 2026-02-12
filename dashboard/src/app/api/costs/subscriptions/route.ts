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
        const { name, provider, monthly_price, currency, used_in_openclaw, active, renewal_day, notes } = body

        if (!name || monthly_price === undefined) {
            return NextResponse.json(
                { error: "name and monthly_price are required" },
                { status: 400 }
            )
        }

        const subscription = await prisma.subscriptions.create({
            data: {
                name,
                provider,
                monthly_price,
                currency: currency || "EUR",
                used_in_openclaw: used_in_openclaw !== false,
                active: active !== false,
                renewal_day: renewal_day || 1,
                notes
            }
        })

        return NextResponse.json(subscription)
    } catch (error) {
        console.error("Failed to create subscription", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
