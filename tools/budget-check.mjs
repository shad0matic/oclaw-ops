#!/usr/bin/env node
/**
 * budget-check.mjs — Pre-flight budget enforcement for Dave
 * 
 * Checks if an agent is within budget before making API calls.
 * Returns exit code 0 if OK, 1 if warning (80%+), 2 if blocked (100%+).
 * 
 * Usage:
 *   budget-check.mjs <agent-id> [--cost-cents <amount>]
 * 
 * Exit codes:
 *   0 = OK (under budget)
 *   1 = WARNING (80%+ of budget used)
 *   2 = BLOCKED (100%+ of budget used or agent paused)
 *   3 = ERROR (DB error or other issue)
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB connection using Unix socket peer authentication
const pool = new pg.Pool({
  host: '/var/run/postgresql',
  database: 'openclaw_db',
});

/**
 * Check budget status for an agent
 */
async function checkBudget(agentId, estimatedCostCents = 0) {
  try {
    // Get budget configuration
    const { rows: budgetRows } = await pool.query(`
      SELECT 
        daily_limit,
        weekly_limit,
        monthly_limit,
        alert_threshold,
        is_paused,
        paused_reason
      FROM ops.agent_budgets
      WHERE agent_id = $1
    `, [agentId]);

    // No budget configured = always allow
    if (budgetRows.length === 0) {
      return { allowed: true, status: 'no_budget', alerts: [] };
    }

    const budget = budgetRows[0];

    // Agent is paused = hard block
    if (budget.is_paused) {
      return {
        allowed: false,
        status: 'paused',
        reason: budget.paused_reason || 'Agent paused by Dave',
        alerts: [],
      };
    }

    // Get current spend for different periods
    const { rows: [dailyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date = CURRENT_DATE
    `, [agentId]);

    const { rows: [weeklyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date >= date_trunc('week', CURRENT_DATE)
    `, [agentId]);

    const { rows: [monthlyRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_cents), 0)::int as spend
      FROM ops.agent_daily_spend
      WHERE agent_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
    `, [agentId]);

    const currentSpend = {
      daily: dailyRow.spend,
      weekly: weeklyRow.spend,
      monthly: monthlyRow.spend,
    };

    // Project spend after this call
    const projectedSpend = {
      daily: currentSpend.daily + estimatedCostCents,
      weekly: currentSpend.weekly + estimatedCostCents,
      monthly: currentSpend.monthly + estimatedCostCents,
    };

    // Calculate percentages
    const alerts = [];
    const blocks = [];

    if (budget.daily_limit) {
      const pct = (projectedSpend.daily / budget.daily_limit) * 100;
      if (pct >= 100) {
        blocks.push({ period: 'daily', percent: pct, limit: budget.daily_limit, current: currentSpend.daily });
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'daily', percent: pct, limit: budget.daily_limit, current: currentSpend.daily });
      }
    }

    if (budget.weekly_limit) {
      const pct = (projectedSpend.weekly / budget.weekly_limit) * 100;
      if (pct >= 100) {
        blocks.push({ period: 'weekly', percent: pct, limit: budget.weekly_limit, current: currentSpend.weekly });
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'weekly', percent: pct, limit: budget.weekly_limit, current: currentSpend.weekly });
      }
    }

    if (budget.monthly_limit) {
      const pct = (projectedSpend.monthly / budget.monthly_limit) * 100;
      if (pct >= 100) {
        blocks.push({ period: 'monthly', percent: pct, limit: budget.monthly_limit, current: currentSpend.monthly });
      } else if (pct >= budget.alert_threshold) {
        alerts.push({ period: 'monthly', percent: pct, limit: budget.monthly_limit, current: currentSpend.monthly });
      }
    }

    // If any budget is exceeded, block
    if (blocks.length > 0) {
      // Auto-pause the agent
      await pool.query(`
        UPDATE ops.agent_budgets
        SET is_paused = TRUE, 
            paused_at = NOW(), 
            paused_reason = $2,
            updated_at = NOW()
        WHERE agent_id = $1 AND is_paused = FALSE
      `, [agentId, `Budget exceeded: ${blocks.map(b => b.period).join(', ')}`]);

      return {
        allowed: false,
        status: 'over_budget',
        blocks,
        alerts,
        currentSpend,
        projectedSpend,
      };
    }

    // Warnings but allowed
    if (alerts.length > 0) {
      return {
        allowed: true,
        status: 'warning',
        alerts,
        blocks: [],
        currentSpend,
        projectedSpend,
      };
    }

    // All good
    return {
      allowed: true,
      status: 'ok',
      alerts: [],
      blocks: [],
      currentSpend,
      projectedSpend,
    };

  } catch (error) {
    console.error('Budget check error:', error);
    return { allowed: true, status: 'error', error: error.message };
  }
}

/**
 * Format cost in cents to USD string
 */
function formatCost(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: budget-check.mjs <agent-id> [options]

Options:
  --cost-cents <amount>   Estimated cost of upcoming call (default: 0)
  --json                  Output as JSON
  --quiet                 Only output errors

Exit codes:
  0 = OK (under budget)
  1 = WARNING (>= alert threshold)
  2 = BLOCKED (over budget or paused)
  3 = ERROR
    `);
    process.exit(0);
  }

  const agentId = args[0];
  const costCentsIdx = args.indexOf('--cost-cents');
  const estimatedCostCents = costCentsIdx >= 0 ? parseInt(args[costCentsIdx + 1]) : 0;
  const jsonOutput = args.includes('--json');
  const quiet = args.includes('--quiet');

  const result = await checkBudget(agentId, estimatedCostCents);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!quiet) {
    if (result.status === 'paused') {
      console.error(`❌ BLOCKED: ${agentId} is paused`);
      console.error(`   Reason: ${result.reason}`);
    } else if (result.status === 'over_budget') {
      console.error(`❌ BLOCKED: ${agentId} over budget`);
      result.blocks.forEach(b => {
        console.error(`   ${b.period}: ${b.percent.toFixed(1)}% (${formatCost(b.current)} / ${formatCost(b.limit)})`);
      });
    } else if (result.status === 'warning') {
      console.warn(`⚠️  WARNING: ${agentId} approaching budget limit`);
      result.alerts.forEach(a => {
        console.warn(`   ${a.period}: ${a.percent.toFixed(1)}% (${formatCost(a.current)} / ${formatCost(a.limit)})`);
      });
    } else if (result.status === 'ok') {
      console.log(`✅ OK: ${agentId} within budget`);
    } else if (result.status === 'no_budget') {
      console.log(`ℹ️  No budget configured for ${agentId}`);
    } else if (result.status === 'error') {
      console.error(`❌ ERROR: ${result.error}`);
    }
  }

  await pool.end();

  // Exit codes
  if (result.status === 'paused' || result.status === 'over_budget') {
    process.exit(2);
  } else if (result.status === 'warning') {
    process.exit(1);
  } else if (result.status === 'error') {
    process.exit(3);
  } else {
    process.exit(0);
  }
}

main();
