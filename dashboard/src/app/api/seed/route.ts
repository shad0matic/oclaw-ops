export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

export async function GET(req: Request) {
    try {
        const agents = [
            { agent_id: 'kevin', name: 'Kevin', level: 10, trust_score: 0.9 },
            { agent_id: 'dr-nefario', name: 'Dr. Nefario', level: 9, trust_score: 0.8 },
            { agent_id: 'bob', name: 'Bob', level: 1, trust_score: 0.5 },
        ]
        
        for (const agent of agents) {
            await pool.query(`
                INSERT INTO memory.agent_profiles (agent_id, name, level, trust_score)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (agent_id) DO NOTHING
            `, [agent.agent_id, agent.name, agent.level, agent.trust_score])
        }

        return NextResponse.json({ message: "Database seeded successfully" })
    } catch (error) {
        console.error("Failed to seed database", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
