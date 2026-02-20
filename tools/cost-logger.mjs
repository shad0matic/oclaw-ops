#!/usr/bin/env node
/**
 * cost-logger.mjs — OpenClaw Gateway → Dave cost tracking
 * 
 * Watches OpenClaw session JSONL files for assistant messages with usage data,
 * then logs each API call to Dave's cost tracking tables.
 * 
 * Phase 2 of SPEC-124: Dave — The Accountant Agent
 * 
 * Run as: node cost-logger.mjs
 * Or via systemd: oclaw-cost-logger.service
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { watch } from 'chokidar';

// Configuration
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');

// Track file positions to only read new lines
const filePositions = new Map();

// Track recently logged to avoid duplicates (messageId -> timestamp)
const recentlyLogged = new Map();
const DEDUP_WINDOW_MS = 60_000; // 1 minute

// Pricing lookup (matches Dave's pricing.ts)
const MODEL_PRICING = {
  anthropic: {
    'claude-opus-4-5': { inputPerMtok: 15.00, outputPerMtok: 75.00, cachedPerMtok: 1.50, tier: 3 },
    'claude-sonnet-4-5': { inputPerMtok: 3.00, outputPerMtok: 15.00, cachedPerMtok: 0.30, tier: 2 },
    'claude-haiku-4-5': { inputPerMtok: 0.80, outputPerMtok: 4.00, cachedPerMtok: 0.08, tier: 1 },
  },
  openai: {
    'gpt-4o': { inputPerMtok: 2.50, outputPerMtok: 10.00, tier: 2 },
    'gpt-4o-mini': { inputPerMtok: 0.15, outputPerMtok: 0.60, tier: 1 },
    'o1': { inputPerMtok: 15.00, outputPerMtok: 60.00, tier: 3 },
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

/**
 * Calculate cost in cents from token usage
 */
function calculateCostCents(provider, model, usage) {
  const pricing = MODEL_PRICING[provider]?.[model];
  if (!pricing) {
    // If model not in pricing table, estimate from usage.cost if available
    if (usage.cost?.total) {
      return Math.round(usage.cost.total * 100);
    }
    console.warn(`Unknown model: ${provider}/${model}, using reported cost or 0`);
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

/**
 * Extract agent ID from session file path
 * Examples:
 *   /home/openclaw/.openclaw/agents/main/sessions/xxx.jsonl -> main
 *   /home/openclaw/.openclaw/agents/bob/sessions/xxx.jsonl -> bob
 */
function extractAgentId(filePath) {
  const match = filePath.match(/\/agents\/([^/]+)\/sessions\//);
  return match ? match[1] : 'unknown';
}

/**
 * Extract session key from file path
 */
function extractSessionKey(filePath) {
  const basename = path.basename(filePath, '.jsonl');
  return basename;
}

/**
 * Get tier for a model
 */
function getTier(provider, model) {
  return MODEL_PRICING[provider]?.[model]?.tier || 1;
}

/**
 * Process a single line from a session JSONL file
 */
async function processLine(pool, line, filePath) {
  try {
    const entry = JSON.parse(line);
    
    // Only process assistant messages with usage data
    if (entry.type !== 'message') return null;
    if (entry.message?.role !== 'assistant') return null;
    if (!entry.message?.usage) return null;

    const { usage, provider, model } = entry.message;
    const messageId = entry.id;

    // Dedup check
    if (recentlyLogged.has(messageId)) {
      return null;
    }
    recentlyLogged.set(messageId, Date.now());
    
    // Clean up old entries
    const now = Date.now();
    for (const [id, ts] of recentlyLogged) {
      if (now - ts > DEDUP_WINDOW_MS) {
        recentlyLogged.delete(id);
      }
    }

    const agentId = extractAgentId(filePath);
    const sessionKey = extractSessionKey(filePath);
    const tier = getTier(provider, model);
    const costCents = calculateCostCents(provider, model, usage);

    // Map usage fields to our schema
    const inputTokens = usage.input || 0;
    const outputTokens = usage.output || 0;
    const cachedTokens = (usage.cacheRead || 0) + (usage.cacheWrite || 0);

    // Log to database
    const result = await pool.query(`
      INSERT INTO ops.agent_costs (
        agent_id, provider, model, input_tokens, output_tokens, cached_tokens,
        cost_cents, tier, session_key, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      agentId, provider, model, inputTokens, outputTokens, cachedTokens,
      costCents, tier, sessionKey, JSON.stringify({
        messageId,
        timestamp: entry.timestamp,
        cacheRead: usage.cacheRead || 0,
        cacheWrite: usage.cacheWrite || 0,
        stopReason: entry.message.stopReason,
      })
    ]);

    // Update daily aggregate
    const tierColumn = `tier${tier}_cents`;
    await pool.query(`
      INSERT INTO ops.agent_daily_spend (date, agent_id, total_cents, call_count, ${tierColumn}, input_tokens, output_tokens, cached_tokens)
      VALUES (CURRENT_DATE, $1, $2, 1, $2, $3, $4, $5)
      ON CONFLICT (date, agent_id) DO UPDATE SET
        total_cents = ops.agent_daily_spend.total_cents + EXCLUDED.total_cents,
        call_count = ops.agent_daily_spend.call_count + 1,
        ${tierColumn} = ops.agent_daily_spend.${tierColumn} + EXCLUDED.${tierColumn},
        input_tokens = ops.agent_daily_spend.input_tokens + EXCLUDED.input_tokens,
        output_tokens = ops.agent_daily_spend.output_tokens + EXCLUDED.output_tokens,
        cached_tokens = ops.agent_daily_spend.cached_tokens + EXCLUDED.cached_tokens
    `, [agentId, costCents, inputTokens, outputTokens, cachedTokens]);

    return {
      id: result.rows[0].id,
      agentId,
      provider,
      model,
      costCents,
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    // Skip malformed lines silently
    if (err instanceof SyntaxError) return null;
    throw err;
  }
}

/**
 * Read new lines from a file since last position
 */
async function readNewLines(pool, filePath) {
  try {
    const stats = fs.statSync(filePath);
    const currentSize = stats.size;
    const lastPosition = filePositions.get(filePath) || 0;

    if (currentSize <= lastPosition) {
      return; // No new data
    }

    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(currentSize - lastPosition);
    fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
    fs.closeSync(fd);

    filePositions.set(filePath, currentSize);

    const lines = buffer.toString('utf8').split('\n').filter(Boolean);
    
    for (const line of lines) {
      const result = await processLine(pool, line, filePath);
      if (result) {
        console.log(`[${new Date().toISOString()}] Logged: ${result.agentId}/${result.model} - ${result.costCents}¢ (${result.inputTokens}in/${result.outputTokens}out)`);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading ${filePath}:`, err.message);
    }
  }
}

/**
 * Scan existing session files and initialize positions to end of file
 * (to avoid re-processing historical data on startup)
 */
function initializeFilePositions() {
  const agentDirs = fs.readdirSync(AGENTS_DIR).filter(d => {
    const stat = fs.statSync(path.join(AGENTS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  });

  for (const agentDir of agentDirs) {
    const sessionsDir = path.join(AGENTS_DIR, agentDir, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      try {
        const stats = fs.statSync(filePath);
        filePositions.set(filePath, stats.size);
      } catch (err) {
        // Skip files that can't be read
      }
    }
  }

  console.log(`Initialized positions for ${filePositions.size} session files`);
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting cost-logger...`);
  console.log(`Watching: ${AGENTS_DIR}`);

  // Database connection
  const pool = new pg.Pool({
    database: process.env.PGDATABASE || 'openclaw_db',
    user: process.env.PGUSER || 'openclaw',
    host: '/var/run/postgresql',
    max: 3
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
    console.log('Connected to Postgres');
  } catch (err) {
    console.error('Failed to connect to Postgres:', err.message);
    process.exit(1);
  }

  // Initialize file positions to current EOF (don't re-process old data)
  initializeFilePositions();

  // Watch for changes to session files
  const watcher = watch(`${AGENTS_DIR}/*/sessions/*.jsonl`, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher.on('change', async (filePath) => {
    await readNewLines(pool, filePath);
  });

  watcher.on('add', async (filePath) => {
    // New file - start from beginning
    filePositions.set(filePath, 0);
    await readNewLines(pool, filePath);
  });

  watcher.on('error', (err) => {
    console.error('Watcher error:', err);
  });

  console.log('Watching for session changes...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await watcher.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  setInterval(() => {
    // Periodic stats
    const memUsage = process.memoryUsage();
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`[${new Date().toISOString()}] Heartbeat: tracking ${filePositions.size} files, ${recentlyLogged.size} recent logs, ${heapMB}MB heap`);
  }, 60_000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
