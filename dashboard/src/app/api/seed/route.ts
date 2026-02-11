
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: Request) {
    try {
        await prisma.agent_profiles.createMany({
            data: [
                { agent_id: 'kevin', name: 'Kevin', level: 10, trust_score: 0.9 },
                { agent_id: 'dr-nefario', name: 'Dr. Nefario', level: 9, trust_score: 0.8 },
                { agent_id: 'bob', name: 'Bob', level: 1, trust_score: 0.5 },
            ],
            skipDuplicates: true,
        })
        return NextResponse.json({ message: "Database seeded successfully" })
    } catch (error) {
        console.error("Failed to seed database", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
