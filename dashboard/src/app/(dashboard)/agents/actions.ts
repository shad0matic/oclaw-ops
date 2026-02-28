"use server"

import { pool } from "@/lib/drizzle"

export async function getAgentModelHistory(agentId: string) {
    const historyResult = await pool.query(`
        SELECT 
            model,
            DATE(created_at) as date,
            COUNT(*) as calls,
            SUM(input_tokens) as input,
            SUM(output_tokens) as output
        FROM ops.agent_costs
        WHERE agent_id = $1
        GROUP BY model, date
        ORDER BY date DESC, calls DESC
        LIMIT 30
    `, [agentId])

    return historyResult.rows
}
