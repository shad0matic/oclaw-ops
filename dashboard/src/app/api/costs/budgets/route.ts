export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"
import { z } from "zod"

const budgetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount_usd: z.number().min(0, "Amount must be positive"),
    period_type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
    alert_threshold_percent: z.number().min(0).max(100).default(80),
    is_active: z.boolean().default(true),
    category: z.string().optional(), // 'ai', 'subscriptions', 'total'
})

// Ensure budgets table exists
async function ensureBudgetsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ops.budgets (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            amount_usd DECIMAL(10, 2) NOT NULL,
            period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
            alert_threshold_percent DECIMAL(5, 2) DEFAULT 80.00,
            category VARCHAR(50) DEFAULT 'total',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `)
}

// GET /api/costs/budgets - List all budgets with current spend
export async function GET() {
    try {
        await ensureBudgetsTable()

        // Get all budgets
        const { rows: budgets } = await pool.query(`
            SELECT * FROM ops.budgets ORDER BY created_at DESC
        `)

        // Calculate current spend for each budget based on period
        const budgetsWithSpend = await Promise.all(budgets.map(async (budget) => {
            let periodStart: string
            switch (budget.period_type) {
                case 'daily':
                    periodStart = "date_trunc('day', NOW())"
                    break
                case 'weekly':
                    periodStart = "date_trunc('week', NOW())"
                    break
                case 'monthly':
                    periodStart = "date_trunc('month', NOW())"
                    break
                case 'quarterly':
                    periodStart = "date_trunc('quarter', NOW())"
                    break
                case 'yearly':
                    periodStart = "date_trunc('year', NOW())"
                    break
                default:
                    periodStart = "date_trunc('month', NOW())"
            }

            // Get AI costs
            const { rows: [aiCosts] } = await pool.query(`
                SELECT COALESCE(SUM(cost_usd), 0) as total_usd
                FROM ops.task_runs
                WHERE created_at >= ${periodStart}
            `)

            // Get subscription costs (prorated for period)
            const { rows: [subCosts] } = await pool.query(`
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN currency = 'USD' THEN monthly_price
                        ELSE monthly_price * 1.08 -- rough EUR to USD
                    END
                ), 0) as monthly_total_usd
                FROM ops.subscriptions
                WHERE active = true
            `)

            // Calculate period-adjusted subscription cost
            let subscriptionCost = Number(subCosts?.monthly_total_usd ?? 0)
            switch (budget.period_type) {
                case 'daily':
                    subscriptionCost = subscriptionCost / 30
                    break
                case 'weekly':
                    subscriptionCost = subscriptionCost / 4
                    break
                case 'quarterly':
                    subscriptionCost = subscriptionCost * 3
                    break
                case 'yearly':
                    subscriptionCost = subscriptionCost * 12
                    break
            }

            const aiCost = Number(aiCosts?.total_usd ?? 0)
            let currentSpend = 0
            
            switch (budget.category) {
                case 'ai':
                    currentSpend = aiCost
                    break
                case 'subscriptions':
                    currentSpend = subscriptionCost
                    break
                default:
                    currentSpend = aiCost + subscriptionCost
            }

            const budgetAmount = Number(budget.amount_usd)
            const percentUsed = budgetAmount > 0 ? (currentSpend / budgetAmount) * 100 : 0
            const alertTriggered = percentUsed >= Number(budget.alert_threshold_percent)

            return {
                ...budget,
                amount_usd: budgetAmount,
                alert_threshold_percent: Number(budget.alert_threshold_percent),
                current_spend_usd: currentSpend,
                percent_used: percentUsed,
                alert_triggered: alertTriggered,
                remaining_usd: Math.max(0, budgetAmount - currentSpend),
            }
        }))

        return NextResponse.json(budgetsWithSpend)
    } catch (error) {
        console.error("Failed to fetch budgets:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/costs/budgets - Create a new budget
export async function POST(req: Request) {
    try {
        await ensureBudgetsTable()
        
        const body = await req.json()
        const parsed = budgetSchema.parse(body)

        const { rows: [budget] } = await pool.query(`
            INSERT INTO ops.budgets (name, amount_usd, period_type, alert_threshold_percent, category, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            parsed.name,
            parsed.amount_usd,
            parsed.period_type,
            parsed.alert_threshold_percent,
            parsed.category || 'total',
            parsed.is_active,
        ])

        return NextResponse.json(budget)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }
        console.error("Failed to create budget:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PATCH /api/costs/budgets?id=X - Update a budget
export async function PATCH(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: "id query param is required" }, { status: 400 })
    }

    try {
        const body = await req.json()
        const parsed = budgetSchema.partial().parse(body)

        const updates: string[] = []
        const values: any[] = [id]
        let paramIndex = 2

        if (parsed.name !== undefined) {
            updates.push(`name = $${paramIndex++}`)
            values.push(parsed.name)
        }
        if (parsed.amount_usd !== undefined) {
            updates.push(`amount_usd = $${paramIndex++}`)
            values.push(parsed.amount_usd)
        }
        if (parsed.period_type !== undefined) {
            updates.push(`period_type = $${paramIndex++}`)
            values.push(parsed.period_type)
        }
        if (parsed.alert_threshold_percent !== undefined) {
            updates.push(`alert_threshold_percent = $${paramIndex++}`)
            values.push(parsed.alert_threshold_percent)
        }
        if (parsed.category !== undefined) {
            updates.push(`category = $${paramIndex++}`)
            values.push(parsed.category)
        }
        if (parsed.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`)
            values.push(parsed.is_active)
        }

        updates.push(`updated_at = NOW()`)

        const { rows: [budget] } = await pool.query(`
            UPDATE ops.budgets 
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *
        `, values)

        return NextResponse.json(budget)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }
        console.error("Failed to update budget:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/costs/budgets?id=X - Delete a budget
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: "id query param is required" }, { status: 400 })
    }

    try {
        await pool.query(`DELETE FROM ops.budgets WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete budget:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
