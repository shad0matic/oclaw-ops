export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"
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
        const subscriptionsResult = await pool.query(`
            SELECT *, monthly_price::float, renewal_day::int FROM ops.subscriptions ORDER BY name ASC
        `)
        return NextResponse.json(subscriptionsResult.rows)
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

        const subscriptionResult = await pool.query(`
            INSERT INTO ops.subscriptions (name, provider, monthly_price, currency, renewal_day, used_in_openclaw, notes, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *, monthly_price::float, renewal_day::int
        `, [
            parsedData.name,
            parsedData.provider,
            parsedData.monthly_price,
            parsedData.currency,
            parsedData.renewal_day,
            parsedData.used_in_openclaw,
            parsedData.notes,
            parsedData.active
        ])

        return NextResponse.json(subscriptionResult.rows[0])
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

        const setClauses = Object.keys(parsedData).map((key, i) => `${key} = $${i + 2}`).join(', ')
        const values = [id, ...Object.values(parsedData)]
        const query = `UPDATE ops.subscriptions SET ${setClauses} WHERE id = $1 RETURNING *, monthly_price::float, renewal_day::int`

        const subscriptionResult = await pool.query(query, values)

        return NextResponse.json(subscriptionResult.rows[0])
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
        const subscriptionResult = await pool.query(`
            UPDATE ops.subscriptions SET active = false WHERE id = $1 RETURNING *, monthly_price::float, renewal_day::int
        `, [id])

        return NextResponse.json(subscriptionResult.rows[0])
    } catch (error) {
        console.error("Failed to delete subscription", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
