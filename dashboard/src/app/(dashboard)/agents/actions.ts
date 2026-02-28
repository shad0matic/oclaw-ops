"use server"

import { pool } from "@/lib/drizzle"
import fs from "fs"
import path from "path"

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

export async function getCurrentAgentModels() {
    try {
        const configPath = path.join(process.env.HOME || "/home/openclaw", ".openclaw", "openclaw.json")
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
        
        const models: Record<string, string> = {}
        if (config.agents?.list) {
            for (const agent of config.agents.list) {
                models[agent.id] = agent.model || config.agents.defaults?.model?.name || "default"
            }
        }
        
        return models
    } catch (error) {
        console.error("Failed to read agent models from config:", error)
        return {}
    }
}
