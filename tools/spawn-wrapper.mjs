#!/usr/bin/env node
/**
 * Spawn wrapper — atomic spawn + DB logging
 * 
 * Usage from agent context (called by Kevin before sessions_spawn):
 *   node tools/spawn-wrapper.mjs log-start --agent bob --task "Fix layout" --model "google/gemini-2.5-pro" --spawned-by kevin --source "telegram:1408"
 *   node tools/spawn-wrapper.mjs log-complete --agent bob --task "Fix layout" --status complete
 *   node tools/spawn-wrapper.mjs log-complete --agent bob --task "Fix layout" --status fail
 * 
 * Writes to ops.agent_events with proper task_start/task_complete events.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('/home/shad/projects/oclaw-ops/dashboard/node_modules/pg');
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://shad@localhost:5432/openclaw_db?host=/var/run/postgresql',
});

const args = process.argv.slice(2);
const action = args[0];

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

async function logStart() {
  const agent = getArg('agent');
  const task = getArg('task');
  const model = getArg('model');
  const spawnedBy = getArg('spawned-by') || 'kevin';
  const source = getArg('source') || 'unknown';

  if (!agent || !task) {
    console.error('Usage: log-start --agent <id> --task "<desc>" [--model <model>] [--spawned-by <id>] [--source <src>]');
    process.exit(1);
  }

  const detail = { task, model, spawned_by: spawnedBy, source };

  await pool.query(
    `INSERT INTO ops.agent_events (agent_id, event_type, detail) VALUES ($1, 'task_start', $2)`,
    [agent, JSON.stringify(detail)]
  );

  console.log(`✅ Logged task_start for ${agent}: ${task}`);
}

async function logComplete() {
  const agent = getArg('agent');
  const task = getArg('task');
  const status = getArg('status') || 'complete';

  if (!agent || !task) {
    console.error('Usage: log-complete --agent <id> --task "<desc>" [--status complete|fail]');
    process.exit(1);
  }

  const eventType = status === 'fail' ? 'task_fail' : 'task_complete';
  const detail = { task };

  await pool.query(
    `INSERT INTO ops.agent_events (agent_id, event_type, detail) VALUES ($1, $2, $3)`,
    [agent, eventType, JSON.stringify(detail)]
  );

  console.log(`✅ Logged ${eventType} for ${agent}: ${task}`);
}

try {
  if (action === 'log-start') await logStart();
  else if (action === 'log-complete') await logComplete();
  else {
    console.error('Usage: spawn-wrapper.mjs <log-start|log-complete> [args]');
    process.exit(1);
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
