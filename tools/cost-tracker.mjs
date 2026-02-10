#!/usr/bin/env node
/**
 * Cost tracker — FX rate update + hourly cost snapshot.
 * 
 * Usage:
 *   node tools/cost-tracker.mjs fx-update          # Fetch daily USD→EUR rate from ECB
 *   node tools/cost-tracker.mjs snapshot            # Write hourly cost snapshot
 *   node tools/cost-tracker.mjs summary             # Show current month summary
 *   node tools/cost-tracker.mjs subscriptions       # List subscriptions
 */
import pg from 'pg';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

// ── FX RATE ─────────────────────────────────────────────
async function fxUpdate() {
  // ECB daily reference rate (XML feed)
  const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
  if (!res.ok) throw new Error(`ECB API error: ${res.status}`);
  const xml = await res.text();
  
  // Extract USD rate from XML
  const match = xml.match(/currency='USD'\s+rate='([^']+)'/);
  if (!match) throw new Error('Could not parse USD rate from ECB XML');
  
  const eurPerUsd = 1 / parseFloat(match[1]); // ECB gives USD per EUR, we want USD→EUR
  const today = new Date().toISOString().split('T')[0];
  
  await pool.query(`
    INSERT INTO ops.fx_rates (rate_date, usd_to_eur, source)
    VALUES ($1, $2, 'ecb')
    ON CONFLICT (rate_date) DO UPDATE SET usd_to_eur = $2, created_at = now()
  `, [today, eurPerUsd]);
  
  return { date: today, usd_to_eur: eurPerUsd.toFixed(6), source: 'ecb' };
}

// Get latest FX rate (fallback to 0.92 if no data)
async function getUsdToEur() {
  const result = await pool.query(
    'SELECT usd_to_eur FROM ops.fx_rates ORDER BY rate_date DESC LIMIT 1'
  );
  return result.rows.length > 0 ? parseFloat(result.rows[0].usd_to_eur) : 0.92;
}

// ── HOURLY SNAPSHOT ─────────────────────────────────────
async function snapshot() {
  const usdToEur = await getUsdToEur();
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  // Fixed costs: prorate monthly subscriptions to hourly
  const subs = await pool.query(
    "SELECT name, provider, monthly_price, currency FROM ops.subscriptions WHERE active = true"
  );
  
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const hoursInMonth = daysInMonth * 24;
  
  let fixedEur = 0;
  const breakdown = { fixed: {}, variable: {} };
  
  for (const sub of subs.rows) {
    let hourlyEur = parseFloat(sub.monthly_price) / hoursInMonth;
    if (sub.currency === 'USD') hourlyEur *= usdToEur;
    fixedEur += hourlyEur;
    breakdown.fixed[sub.name] = parseFloat(hourlyEur.toFixed(4));
  }
  
  // Variable costs: sum agent_events.cost_usd for this hour
  const varResult = await pool.query(`
    SELECT COALESCE(SUM(cost_usd), 0) as total_usd,
           agent_id,
           COUNT(*) as event_count
    FROM ops.agent_events
    WHERE created_at >= $1 AND created_at < $1 + interval '1 hour'
    AND cost_usd IS NOT NULL
    GROUP BY agent_id
  `, [hourStart]);
  
  let variableEur = 0;
  for (const row of varResult.rows) {
    const costEur = parseFloat(row.total_usd) * usdToEur;
    variableEur += costEur;
    breakdown.variable[row.agent_id] = parseFloat(costEur.toFixed(4));
  }
  
  const totalEur = fixedEur + variableEur;
  
  await pool.query(`
    INSERT INTO ops.cost_snapshots (snapshot_hour, fixed_eur, variable_eur, total_eur, breakdown)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
  `, [hourStart, fixedEur.toFixed(4), variableEur.toFixed(4), totalEur.toFixed(4), JSON.stringify(breakdown)]);
  
  return {
    hour: hourStart.toISOString(),
    fixed_eur: fixedEur.toFixed(4),
    variable_eur: variableEur.toFixed(4),
    total_eur: totalEur.toFixed(4),
    fx_rate: usdToEur.toFixed(6),
  };
}

// ── MONTHLY SUMMARY ─────────────────────────────────────
async function summary() {
  const usdToEur = await getUsdToEur();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  
  // Fixed: all subscriptions prorated to current day
  const subs = await pool.query(
    "SELECT name, provider, monthly_price, currency, used_in_openclaw FROM ops.subscriptions WHERE active = true ORDER BY name"
  );
  
  let totalFixedMonthly = 0;
  let openclawFixedMonthly = 0;
  const subDetails = [];
  
  for (const sub of subs.rows) {
    let monthlyEur = parseFloat(sub.monthly_price);
    if (sub.currency === 'USD') monthlyEur *= usdToEur;
    totalFixedMonthly += monthlyEur;
    if (sub.used_in_openclaw) openclawFixedMonthly += monthlyEur;
    subDetails.push({
      name: sub.name,
      monthly_eur: monthlyEur.toFixed(2),
      mtd_eur: (monthlyEur * dayOfMonth / daysInMonth).toFixed(2),
      openclaw: sub.used_in_openclaw,
    });
  }
  
  // Variable: sum from agent_events this month
  const varResult = await pool.query(`
    SELECT COALESCE(SUM(cost_usd), 0) as total_usd
    FROM ops.agent_events
    WHERE created_at >= $1 AND cost_usd IS NOT NULL
  `, [monthStart]);
  
  const variableMtdEur = parseFloat(varResult.rows[0].total_usd) * usdToEur;
  
  // Projections
  const fixedMtd = totalFixedMonthly * dayOfMonth / daysInMonth;
  const variableProjected = (variableMtdEur / dayOfMonth) * daysInMonth;
  
  return {
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    day: `${dayOfMonth}/${daysInMonth}`,
    fx_usd_to_eur: usdToEur.toFixed(4),
    fixed: {
      monthly_total_eur: totalFixedMonthly.toFixed(2),
      openclaw_only_eur: openclawFixedMonthly.toFixed(2),
      mtd_eur: fixedMtd.toFixed(2),
    },
    variable: {
      mtd_eur: variableMtdEur.toFixed(2),
      projected_month_eur: variableProjected.toFixed(2),
    },
    total: {
      mtd_eur: (fixedMtd + variableMtdEur).toFixed(2),
      projected_month_eur: (totalFixedMonthly + variableProjected).toFixed(2),
    },
    subscriptions: subDetails,
  };
}

// ── SUBSCRIPTIONS LIST ──────────────────────────────────
async function listSubscriptions() {
  const result = await pool.query(
    'SELECT name, provider, monthly_price, currency, used_in_openclaw, active, notes FROM ops.subscriptions ORDER BY name'
  );
  return result.rows;
}

// ── CLI ─────────────────────────────────────────────────
const command = process.argv[2];

try {
  let output;
  switch (command) {
    case 'fx-update': output = await fxUpdate(); break;
    case 'snapshot': output = await snapshot(); break;
    case 'summary': output = await summary(); break;
    case 'subscriptions': output = await listSubscriptions(); break;
    default:
      console.error('Commands: fx-update | snapshot | summary | subscriptions');
      process.exit(1);
  }
  console.log(JSON.stringify(output, null, 2));
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
