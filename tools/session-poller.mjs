#!/usr/bin/env node
/**
 * Session Poller — reads all OpenClaw agent session files and writes
 * live status to ops.live_sessions table.
 * 
 * Run via cron every 30s or on-demand.
 * Usage: node tools/session-poller.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('/home/shad/projects/oclaw-ops/dashboard/node_modules/pg');

const AGENTS_DIR = '/home/shad/.openclaw/agents';
const ACTIVE_MINUTES = 15; // consider sessions active if updated in last 15 min

const pool = new pg.Pool({
  connectionString: 'postgresql://shad@localhost:5432/openclaw_db?host=/var/run/postgresql',
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ops.live_sessions (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      session_key TEXT NOT NULL,
      session_id TEXT,
      kind TEXT,
      model TEXT,
      total_tokens INT DEFAULT 0,
      input_tokens INT DEFAULT 0,
      output_tokens INT DEFAULT 0,
      updated_at TIMESTAMPTZ,
      label TEXT,
      is_active BOOLEAN DEFAULT false,
      polled_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(session_key)
    );
    CREATE INDEX IF NOT EXISTS idx_live_sessions_agent ON ops.live_sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_live_sessions_active ON ops.live_sessions(is_active) WHERE is_active = true;
  `);
}

function readAgentSessions(agentId) {
  const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
  if (!existsSync(sessionsFile)) return [];
  
  try {
    const data = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
    // sessions.json is an object with session keys as keys
    const sessions = [];
    for (const [key, session] of Object.entries(data)) {
      sessions.push({
        agentId,
        key,
        ...session,
      });
    }
    return sessions;
  } catch (e) {
    console.error(`Error reading ${sessionsFile}: ${e.message}`);
    return [];
  }
}

async function poll() {
  await ensureTable();
  
  const now = Date.now();
  const activeThreshold = now - (ACTIVE_MINUTES * 60 * 1000);
  
  // Read all agent session files
  const agentDirs = readdirSync(AGENTS_DIR).filter(d => {
    const sessPath = join(AGENTS_DIR, d, 'sessions', 'sessions.json');
    return existsSync(sessPath);
  });
  
  const allSessions = [];
  for (const agentId of agentDirs) {
    const sessions = readAgentSessions(agentId);
    allSessions.push(...sessions);
  }
  
  // Filter to recent sessions and deduplicate (skip :run: duplicates)
  const uniqueSessions = allSessions.filter(s => !s.key.includes(':run:'));
  
  // Mark all existing as inactive first
  await pool.query(`UPDATE ops.live_sessions SET is_active = false, polled_at = now()`);
  
  // Upsert each session
  for (const s of uniqueSessions) {
    const updatedAt = s.updatedAt ? new Date(s.updatedAt) : null;
    const isActive = updatedAt && updatedAt.getTime() > activeThreshold;
    
    // Extract label from key
    let label = s.key;
    if (s.key.includes('subagent:')) label = s.label || 'sub-agent task';
    else if (s.key.includes('cron:')) label = s.label || 'cron job';
    else if (s.key.includes('telegram:')) {
      const topicMatch = s.key.match(/topic:(\d+)/);
      label = topicMatch ? `telegram topic ${topicMatch[1]}` : 'telegram';
    }
    
    await pool.query(`
      INSERT INTO ops.live_sessions (agent_id, session_key, session_id, kind, model, total_tokens, input_tokens, output_tokens, updated_at, label, is_active, polled_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      ON CONFLICT (session_key) DO UPDATE SET
        model = EXCLUDED.model,
        total_tokens = EXCLUDED.total_tokens,
        input_tokens = EXCLUDED.input_tokens,
        output_tokens = EXCLUDED.output_tokens,
        updated_at = EXCLUDED.updated_at,
        label = EXCLUDED.label,
        is_active = EXCLUDED.is_active,
        polled_at = now()
    `, [
      s.agentId,
      s.key,
      s.sessionId || null,
      s.kind || null,
      s.model || null,
      s.totalTokens || 0,
      s.inputTokens || 0,
      s.outputTokens || 0,
      updatedAt,
      label,
      isActive || false,
    ]);
  }
  
  // Count active
  const { rows } = await pool.query(`SELECT agent_id, COUNT(*) as cnt FROM ops.live_sessions WHERE is_active = true GROUP BY agent_id`);
  
  const activeCount = rows.reduce((sum, r) => sum + parseInt(r.cnt), 0);
  console.log(`Polled ${uniqueSessions.length} sessions across ${agentDirs.length} agents. ${activeCount} active.`);
  if (rows.length > 0) {
    rows.forEach(r => console.log(`  ${r.agent_id}: ${r.cnt} active`));
  }
}

try {
  await poll();
} catch (e) {
  console.error('Poll error:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
