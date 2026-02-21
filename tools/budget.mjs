#!/usr/bin/env node
/**
 * budget.mjs — Budget management CLI for Dave
 * 
 * Commands:
 *   budget show [agent-id]               Show budget status
 *   budget set <agent-id> [options]      Set budget limits
 *   budget pause <agent-id> [reason]     Pause an agent
 *   budget resume <agent-id>             Resume a paused agent
 *   budget list                          List all budgets
 * 
 * Examples:
 *   budget show kevin
 *   budget set kevin --daily 500 --weekly 2000 --monthly 8000
 *   budget pause kevin "Testing Dave budget system"
 *   budget resume kevin
 */

import pg from 'pg';

// DB connection using Unix socket peer authentication
const pool = new pg.Pool({
  host: '/var/run/postgresql',
  database: 'openclaw_db',
});

/**
 * Format cost in cents to USD
 */
function fmt(cents) {
  if (cents === null || cents === undefined) return 'none';
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format percentage
 */
function pct(value) {
  return value !== null ? `${value.toFixed(1)}%` : 'N/A';
}

/**
 * Show budget status for an agent
 */
async function showBudget(agentId) {
  // Get budget config
  const { rows: budgetRows } = await pool.query(`
    SELECT * FROM ops.agent_budgets WHERE agent_id = $1
  `, [agentId]);

  if (budgetRows.length === 0) {
    console.log(`No budget configured for ${agentId}`);
    console.log(`Run: budget set ${agentId} --daily <cents> --weekly <cents> --monthly <cents>`);
    return;
  }

  const budget = budgetRows[0];

  // Get current spend
  const { rows: [daily] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0)::int as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date = CURRENT_DATE
  `, [agentId]);

  const { rows: [weekly] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0)::int as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date >= date_trunc('week', CURRENT_DATE)
  `, [agentId]);

  const { rows: [monthly] } = await pool.query(`
    SELECT COALESCE(SUM(total_cents), 0)::int as spend
    FROM ops.agent_daily_spend
    WHERE agent_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
  `, [agentId]);

  console.log(`\n📊 Budget Status: ${agentId}\n`);
  console.log(`Status: ${budget.is_paused ? '⏸️  PAUSED' : '✅ Active'}`);
  if (budget.is_paused) {
    console.log(`Paused at: ${budget.paused_at}`);
    console.log(`Reason: ${budget.paused_reason || 'N/A'}`);
  }
  console.log(`Alert threshold: ${budget.alert_threshold}%\n`);

  // Daily
  const dailyPct = budget.daily_limit ? (daily.spend / budget.daily_limit * 100) : null;
  const dailyStatus = !budget.daily_limit ? '—' : dailyPct >= 100 ? '🔴' : dailyPct >= budget.alert_threshold ? '🟡' : '🟢';
  console.log(`Daily:   ${dailyStatus}  ${fmt(daily.spend)} / ${fmt(budget.daily_limit)}  (${pct(dailyPct)})`);

  // Weekly
  const weeklyPct = budget.weekly_limit ? (weekly.spend / budget.weekly_limit * 100) : null;
  const weeklyStatus = !budget.weekly_limit ? '—' : weeklyPct >= 100 ? '🔴' : weeklyPct >= budget.alert_threshold ? '🟡' : '🟢';
  console.log(`Weekly:  ${weeklyStatus}  ${fmt(weekly.spend)} / ${fmt(budget.weekly_limit)}  (${pct(weeklyPct)})`);

  // Monthly
  const monthlyPct = budget.monthly_limit ? (monthly.spend / budget.monthly_limit * 100) : null;
  const monthlyStatus = !budget.monthly_limit ? '—' : monthlyPct >= 100 ? '🔴' : monthlyPct >= budget.alert_threshold ? '🟡' : '🟢';
  console.log(`Monthly: ${monthlyStatus}  ${fmt(monthly.spend)} / ${fmt(budget.monthly_limit)}  (${pct(monthlyPct)})`);
  console.log('');
}

/**
 * Set budget limits for an agent
 */
async function setBudget(agentId, options) {
  const updates = [];
  const values = [agentId];
  let idx = 2;

  if (options.daily !== undefined) {
    updates.push(`daily_limit = $${idx++}`);
    values.push(options.daily);
  }
  if (options.weekly !== undefined) {
    updates.push(`weekly_limit = $${idx++}`);
    values.push(options.weekly);
  }
  if (options.monthly !== undefined) {
    updates.push(`monthly_limit = $${idx++}`);
    values.push(options.monthly);
  }
  if (options.alert !== undefined) {
    updates.push(`alert_threshold = $${idx++}`);
    values.push(options.alert);
  }

  if (updates.length === 0) {
    console.error('No budget values provided. Use --daily, --weekly, --monthly, or --alert');
    process.exit(1);
  }

  updates.push('updated_at = NOW()');

  await pool.query(`
    INSERT INTO ops.agent_budgets (agent_id, daily_limit, weekly_limit, monthly_limit, alert_threshold)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (agent_id) DO UPDATE SET ${updates.join(', ')}
  `, [
    agentId,
    options.daily ?? null,
    options.weekly ?? null,
    options.monthly ?? null,
    options.alert ?? 80
  ]);

  console.log(`✅ Budget updated for ${agentId}`);
  await showBudget(agentId);
}

/**
 * Pause an agent
 */
async function pauseAgent(agentId, reason = 'Manual pause') {
  const { rowCount } = await pool.query(`
    UPDATE ops.agent_budgets
    SET is_paused = TRUE, paused_at = NOW(), paused_reason = $2, updated_at = NOW()
    WHERE agent_id = $1
  `, [agentId, reason]);

  if (rowCount === 0) {
    console.error(`❌ No budget found for ${agentId}. Create one first with: budget set ${agentId} ...`);
    process.exit(1);
  }

  console.log(`⏸️  Paused ${agentId}: ${reason}`);
}

/**
 * Resume a paused agent
 */
async function resumeAgent(agentId) {
  const { rowCount } = await pool.query(`
    UPDATE ops.agent_budgets
    SET is_paused = FALSE, paused_at = NULL, paused_reason = NULL, updated_at = NOW()
    WHERE agent_id = $1
  `, [agentId]);

  if (rowCount === 0) {
    console.error(`❌ No budget found for ${agentId}`);
    process.exit(1);
  }

  console.log(`▶️  Resumed ${agentId}`);
}

/**
 * List all budgets
 */
async function listBudgets() {
  const { rows } = await pool.query(`
    SELECT 
      b.agent_id,
      b.daily_limit,
      b.weekly_limit,
      b.monthly_limit,
      b.is_paused,
      COALESCE(d.spend, 0) as daily_spend
    FROM ops.agent_budgets b
    LEFT JOIN (
      SELECT agent_id, SUM(total_cents)::int as spend
      FROM ops.agent_daily_spend
      WHERE date = CURRENT_DATE
      GROUP BY agent_id
    ) d ON b.agent_id = d.agent_id
    ORDER BY b.agent_id
  `);

  if (rows.length === 0) {
    console.log('No budgets configured yet.');
    return;
  }

  console.log('\n📊 All Agent Budgets\n');
  console.log('Agent          Status  Today       Daily Limit  Weekly Limit  Monthly Limit');
  console.log('─'.repeat(80));

  rows.forEach(r => {
    const status = r.is_paused ? '⏸️ ' : '✅';
    const today = fmt(r.daily_spend).padEnd(11);
    const daily = fmt(r.daily_limit).padEnd(12);
    const weekly = fmt(r.weekly_limit).padEnd(13);
    const monthly = fmt(r.monthly_limit);
    console.log(`${r.agent_id.padEnd(14)} ${status}  ${today} ${daily} ${weekly} ${monthly}`);
  });
  console.log('');
}

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--daily' && args[i + 1]) {
      options.daily = parseInt(args[++i]);
    } else if (args[i] === '--weekly' && args[i + 1]) {
      options.weekly = parseInt(args[++i]);
    } else if (args[i] === '--monthly' && args[i + 1]) {
      options.monthly = parseInt(args[++i]);
    } else if (args[i] === '--alert' && args[i + 1]) {
      options.alert = parseInt(args[++i]);
    }
  }
  return options;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Dave Budget Management CLI

Usage:
  budget show [agent-id]                Show budget status for agent (or all)
  budget set <agent-id> [options]       Set budget limits
  budget pause <agent-id> [reason]      Pause an agent
  budget resume <agent-id>              Resume a paused agent
  budget list                           List all budgets

Options for 'set':
  --daily <cents>       Daily budget limit in cents (e.g., 500 = $5.00)
  --weekly <cents>      Weekly budget limit in cents
  --monthly <cents>     Monthly budget limit in cents
  --alert <percent>     Alert threshold percentage (default: 80)

Examples:
  budget show kevin
  budget set kevin --daily 500 --weekly 2000 --monthly 8000
  budget set stuart --daily 1000 --alert 75
  budget pause kevin "Testing budget enforcement"
  budget resume kevin
  budget list
    `);
    process.exit(0);
  }

  const command = args[0];

  try {
    if (command === 'show') {
      const agentId = args[1];
      if (!agentId) {
        await listBudgets();
      } else {
        await showBudget(agentId);
      }
    } else if (command === 'set') {
      const agentId = args[1];
      if (!agentId) {
        console.error('Missing agent ID. Usage: budget set <agent-id> [options]');
        process.exit(1);
      }
      const options = parseArgs(args.slice(2));
      await setBudget(agentId, options);
    } else if (command === 'pause') {
      const agentId = args[1];
      if (!agentId) {
        console.error('Missing agent ID. Usage: budget pause <agent-id> [reason]');
        process.exit(1);
      }
      const reason = args.slice(2).join(' ') || 'Manual pause';
      await pauseAgent(agentId, reason);
    } else if (command === 'resume') {
      const agentId = args[1];
      if (!agentId) {
        console.error('Missing agent ID. Usage: budget resume <agent-id>');
        process.exit(1);
      }
      await resumeAgent(agentId);
    } else if (command === 'list') {
      await listBudgets();
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Run "budget --help" for usage');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
