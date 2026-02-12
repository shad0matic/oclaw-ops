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
        const compounds = await prisma.compounds.findMany({
            orderBy: { period_start: 'desc' },
            take: 50
        })

        return NextResponse.json(compounds.map(c => ({
            ...c,
            id: c.id.toString()
        })))
    } catch (error) {
        console.error("Failed to fetch compounds", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
