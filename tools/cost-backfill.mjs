#!/usr/bin/env node
/**
 * cost-backfill.mjs — Backfill Dave cost tracking from session history
 * 
 * Processes historical session JSONL files to populate the cost tracking tables.
 * Safe to run multiple times — uses messageId deduplication.
 * 
 * Usage:
 *   node cost-backfill.mjs              # Last 24 hours
 *   node cost-backfill.mjs --days 7     # Last 7 days
 *   node cost-backfill.mjs --all        # All sessions
 *   node cost-backfill.mjs --agent bob  # Specific agent
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import readline from 'readline';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');

// Parse CLI args
const args = process.argv.slice(2);
let daysBack = 1;
let specificAgent = null;
let processAll = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--days' && args[i + 1]) {
    daysBack = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--all') {
    processAll = true;
  } else if (args[i] === '--agent' && args[i + 1]) {
    specificAgent = args[i + 1];
    i++;
  }
}

// Pricing (same as cost-logger.mjs)
const MODEL_PRICING = {
  anthropic: {
    'claude-opus-4-5': { inputPerMtok: 15.00, outputPerMtok: 75.00, cachedPerMtok: 1.50, tier: 3 },
    'claude-sonnet-4-5': { inputPerMtok: 3.00, outputPerMtok: 15.00, cachedPerMtok: 0.30, tier: 2 },
    'claude-haiku-4-5': { inputPerMtok: 0.80, outputPerMtok: 4.00, cachedPerMtok: 0.08, tier: 1 },
  },
  openai: {
    'gpt-4o': { inputPerMtok: 2.50, outputPerMtok: 10.00, tier: 2 },
    'gpt-4o-mini': { inputPerMtok: 0.15, outputPerMtok: 0.60, tier: 1 },
  },
  google: {
    'gemini-2.5-pro': { inputPerMtok: 1.25, outputPerMtok: 10.00, tier: 2 },
    'gemini-2.0-flash': { inputPerMtok: 0.10, outputPerMtok: 0.40, tier: 1 },
  },
  minimax: {
    'MiniMax-M2.5': { inputPerMtok: 0.15, outputPerMtok: 1.10, tier: 1 },
  },
  xai: {
    'grok-2': { inputPerMtok: 2.00, outputPerMtok: 10.00, tier: 2 },
    'grok-3': { inputPerMtok: 3.00, outputPerMtok: 15.00, tier: 2 },
  },
  deepseek: {
    'deepseek-chat': { inputPerMtok: 0.14, outputPerMtok: 0.28, tier: 1 },
  },
};

function calculateCostCents(provider, model, usage) {
  const pricing = MODEL_PRICING[provider]?.[model];
  if (!pricing) {
    if (usage.cost?.total) {
      return Math.round(usage.cost.total * 100);
    }
    return 0;
  }

  const inputCents = Math.round((usage.input / 1_000_000) * pricing.inputPerMtok * 100);
  const outputCents = Math.round((usage.output / 1_000_000) * pricing.outputPerMtok * 100);
  const cachedCents = Math.round(
    ((usage.cacheRead || 0) / 1_000_000) * (pricing.cachedPerMtok || 0) * 100
  );
  const cacheWriteCents = Math.round(
    ((usage.cacheWrite || 0) / 1_000_000) * (pricing.inputPerMtok || 0) * 100
  );

  return inputCents + outputCents + cachedCents + cacheWriteCents;
}

function extractAgentId(filePath) {
  const match = filePath.match(/\/agents\/([^/]+)\/sessions\//);
  return match ? match[1] : 'unknown';
}

function extractSessionKey(filePath) {
  return path.basename(filePath, '.jsonl');
}

function getTier(provider, model) {
  return MODEL_PRICING[provider]?.[model]?.tier || 1;
}

async function processFile(pool, filePath, cutoffDate, stats) {
  const agentId = extractAgentId(filePath);
  const sessionKey = extractSessionKey(filePath);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      if (entry.type !== 'message') continue;
      if (entry.message?.role !== 'assistant') continue;
      if (!entry.message?.usage) continue;

      // Check timestamp
      const timestamp = new Date(entry.timestamp);
      if (!processAll && cutoffDate && timestamp < cutoffDate) continue;

      const { usage, provider, model } = entry.message;
      const messageId = entry.id;
      const tier = getTier(provider, model);
      const costCents = calculateCostCents(provider, model, usage);

      const inputTokens = usage.input || 0;
      const outputTokens = usage.output || 0;
      const cachedTokens = (usage.cacheRead || 0) + (usage.cacheWrite || 0);

      // Upsert (use metadata->messageId for dedup)
      const result = await pool.query(`
        INSERT INTO ops.agent_costs (
          agent_id, provider, model, input_tokens, output_tokens, cached_tokens,
          cost_cents, tier, session_key, created_at, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        agentId, provider, model, inputTokens, outputTokens, cachedTokens,
        costCents, tier, sessionKey, timestamp,
        JSON.stringify({
          messageId,
          cacheRead: usage.cacheRead || 0,
          cacheWrite: usage.cacheWrite || 0,
          stopReason: entry.message.stopReason,
          backfilled: true,
        })
      ]);

      if (result.rowCount > 0) {
        stats.inserted++;
        stats.totalCostCents += costCents;
      } else {
        stats.skipped++;
      }
      stats.processed++;

      if (stats.processed % 100 === 0) {
        process.stdout.write(`\rProcessed: ${stats.processed}, Inserted: ${stats.inserted}, Skipped: ${stats.skipped}`);
      }
    } catch (err) {
      if (!(err instanceof SyntaxError)) {
        console.error('\nError processing line:', err.message);
      }
    }
  }
}

async function rebuildDailyAggregates(pool) {
  console.log('\nRebuilding daily aggregates...');
  
  // Truncate and rebuild from agent_costs
  await pool.query(`
    DELETE FROM ops.agent_daily_spend;
    
    INSERT INTO ops.agent_daily_spend (date, agent_id, total_cents, call_count, tier1_cents, tier2_cents, tier3_cents, input_tokens, output_tokens, cached_tokens)
    SELECT 
      DATE(created_at) as date,
      agent_id,
      SUM(cost_cents) as total_cents,
      COUNT(*) as call_count,
      SUM(CASE WHEN tier = 1 THEN cost_cents ELSE 0 END) as tier1_cents,
      SUM(CASE WHEN tier = 2 THEN cost_cents ELSE 0 END) as tier2_cents,
      SUM(CASE WHEN tier = 3 THEN cost_cents ELSE 0 END) as tier3_cents,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cached_tokens) as cached_tokens
    FROM ops.agent_costs
    GROUP BY DATE(created_at), agent_id
    ON CONFLICT (date, agent_id) DO UPDATE SET
      total_cents = EXCLUDED.total_cents,
      call_count = EXCLUDED.call_count,
      tier1_cents = EXCLUDED.tier1_cents,
      tier2_cents = EXCLUDED.tier2_cents,
      tier3_cents = EXCLUDED.tier3_cents,
      input_tokens = EXCLUDED.input_tokens,
      output_tokens = EXCLUDED.output_tokens,
      cached_tokens = EXCLUDED.cached_tokens;
  `);
  
  console.log('Daily aggregates rebuilt.');
}

async function main() {
  console.log('=== Dave Cost Backfill ===');
  console.log(`Mode: ${processAll ? 'All history' : `Last ${daysBack} day(s)`}`);
  if (specificAgent) console.log(`Agent filter: ${specificAgent}`);

  const pool = new pg.Pool({
    database: process.env.PGDATABASE || 'openclaw_db',
    user: process.env.PGUSER || 'openclaw',
    host: '/var/run/postgresql',
    max: 3
  });

  try {
    await pool.query('SELECT 1');
    console.log('Connected to Postgres');
  } catch (err) {
    console.error('Failed to connect to Postgres:', err.message);
    process.exit(1);
  }

  const cutoffDate = processAll ? null : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const stats = { processed: 0, inserted: 0, skipped: 0, totalCostCents: 0 };

  // Find all agent directories
  let agentDirs = fs.readdirSync(AGENTS_DIR).filter(d => {
    const fullPath = path.join(AGENTS_DIR, d);
    return fs.statSync(fullPath).isDirectory() && !d.startsWith('.');
  });

  if (specificAgent) {
    agentDirs = agentDirs.filter(d => d === specificAgent);
  }

  console.log(`Found ${agentDirs.length} agent(s): ${agentDirs.join(', ')}`);

  for (const agentDir of agentDirs) {
    const sessionsDir = path.join(AGENTS_DIR, agentDir, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    console.log(`\nAgent ${agentDir}: ${files.length} session files`);

    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      
      // Skip if file is older than cutoff (quick check on mtime)
      if (!processAll && cutoffDate) {
        const stat = fs.statSync(filePath);
        if (stat.mtime < cutoffDate) continue;
      }

      await processFile(pool, filePath, cutoffDate, stats);
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Inserted:  ${stats.inserted}`);
  console.log(`Skipped:   ${stats.skipped} (duplicates)`);
  console.log(`Total cost logged: $${(stats.totalCostCents / 100).toFixed(2)}`);

  // Rebuild daily aggregates
  await rebuildDailyAggregates(pool);

  await pool.end();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
