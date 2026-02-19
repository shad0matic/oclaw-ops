export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"

// GET /api/costs/summary?days=30
// Returns aggregated cost data for charts: by model, by agent, daily trends
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30")))

    try {
        // Cost by model (from task_runs)
        const { rows: byModel } = await pool.query(`
            SELECT 
                COALESCE(model_alias, model_used) as model,
                COUNT(*) as run_count,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY COALESCE(model_alias, model_used)
            ORDER BY cost_usd DESC
            LIMIT 10
        `)

        // Cost by agent (from task_runs)
        const { rows: byAgent } = await pool.query(`
            SELECT 
                agent_id,
                COUNT(*) as run_count,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY agent_id
            ORDER BY cost_usd DESC
        `)

        // Daily cost trend (from task_runs)
        const { rows: dailyTrend } = await pool.query(`
            SELECT 
                date_trunc('day', created_at)::date as day,
                COUNT(*) as run_count,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY date_trunc('day', created_at)
            ORDER BY day ASC
        `)

        // Current month totals
        const { rows: [monthTotals] } = await pool.query(`
            SELECT 
                COUNT(*) as run_count,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at >= date_trunc('month', NOW())
        `)

        // Yesterday's costs for comparison
        const { rows: [yesterdayTotals] } = await pool.query(`
            SELECT 
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
              AND created_at < date_trunc('day', NOW())
        `)

        // Today's costs
        const { rows: [todayTotals] } = await pool.query(`
            SELECT 
                COALESCE(SUM(cost_usd), 0) as cost_usd,
                COALESCE(SUM(cost_eur), 0) as cost_eur
            FROM ops.task_runs
            WHERE created_at >= date_trunc('day', NOW())
        `)

        // Top 5 most expensive tasks this month
        const { rows: expensiveTasks } = await pool.query(`
            SELECT 
                tr.task_id,
                tr.task_description,
                tr.agent_id,
                COALESCE(tr.model_alias, tr.model_used) as model,
                tr.cost_usd,
                tr.cost_eur,
                tr.input_tokens,
                tr.output_tokens,
                tr.created_at
            FROM ops.task_runs tr
            WHERE tr.created_at >= date_trunc('month', NOW())
              AND tr.cost_usd > 0
            ORDER BY tr.cost_usd DESC
            LIMIT 5
        `)

        return NextResponse.json({
            byModel: byModel.map(r => ({
                model: r.model || 'unknown',
                runCount: Number(r.run_count),
                inputTokens: Number(r.input_tokens),
                outputTokens: Number(r.output_tokens),
                costUsd: Number(r.cost_usd),
                costEur: Number(r.cost_eur),
            })),
            byAgent: byAgent.map(r => ({
                agent: r.agent_id || 'unknown',
                runCount: Number(r.run_count),
                inputTokens: Number(r.input_tokens),
                outputTokens: Number(r.output_tokens),
                costUsd: Number(r.cost_usd),
                costEur: Number(r.cost_eur),
            })),
            dailyTrend: dailyTrend.map(r => ({
                day: r.day,
                runCount: Number(r.run_count),
                inputTokens: Number(r.input_tokens),
                outputTokens: Number(r.output_tokens),
                costUsd: Number(r.cost_usd),
                costEur: Number(r.cost_eur),
            })),
            monthTotals: {
                runCount: Number(monthTotals?.run_count ?? 0),
                inputTokens: Number(monthTotals?.input_tokens ?? 0),
                outputTokens: Number(monthTotals?.output_tokens ?? 0),
                costUsd: Number(monthTotals?.cost_usd ?? 0),
                costEur: Number(monthTotals?.cost_eur ?? 0),
            },
            yesterdayTotals: {
                costUsd: Number(yesterdayTotals?.cost_usd ?? 0),
                costEur: Number(yesterdayTotals?.cost_eur ?? 0),
            },
            todayTotals: {
                costUsd: Number(todayTotals?.cost_usd ?? 0),
                costEur: Number(todayTotals?.cost_eur ?? 0),
            },
            expensiveTasks: expensiveTasks.map(r => ({
                taskId: r.task_id,
                description: r.task_description,
                agent: r.agent_id,
                model: r.model,
                costUsd: Number(r.cost_usd),
                costEur: Number(r.cost_eur),
                inputTokens: Number(r.input_tokens),
                outputTokens: Number(r.output_tokens),
                createdAt: r.created_at,
            })),
            days,
        })
    } catch (error) {
        console.error("Cost summary fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch cost summary" }, { status: 500 })
    }
}
