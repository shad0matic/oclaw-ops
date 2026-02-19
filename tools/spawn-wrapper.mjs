#!/usr/bin/env node
/**
 * Spawn wrapper — atomic spawn + DB logging (both Kanban + Events)
 * 
 * Usage from agent context (called by Kevin before sessions_spawn):
 *   node tools/spawn-wrapper.mjs log-start --agent bob --task "Fix layout" --model "google/gemini-2.5-pro" --spawned-by kevin --source "telegram:1408" --project "dashboard"
 *   node tools/spawn-wrapper.mjs log-complete --agent bob --task "Fix layout" --status complete
 *   node tools/spawn-wrapper.mjs log-complete --agent bob --task "Fix layout" --status fail
 * 
 * Writes to:
 *   - ops.task_queue (Kanban visibility)
 *   - ops.agent_events (activity log)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('/home/openclaw/projects/oclaw-ops/dashboard/node_modules/pg');
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
  const project = getArg('project') || 'infra';

  if (!agent || !task) {
    console.error('Usage: log-start --agent <id> --task "<desc>" [--model <model>] [--spawned-by <id>] [--source <src>] [--project <proj>]');
    process.exit(1);
  }

  const detail = { task, model, spawned_by: spawnedBy, source };

  // 1. Insert into task_queue (Kanban)
  const kanbanResult = await pool.query(
    `INSERT INTO ops.task_queue (title, project, agent_id, status, created_by, started_at) 
     VALUES ($1, $2, $3, 'running', $4, NOW()) 
     RETURNING id`,
    [task, project, agent, spawnedBy]
  );
  const taskId = kanbanResult.rows[0].id;

  // 2. Insert into agent_events (activity log) with task_id reference
  await pool.query(
    `INSERT INTO ops.agent_events (agent_id, event_type, detail, task_id) VALUES ($1, 'task_start', $2, $3)`,
    [agent, JSON.stringify(detail), taskId]
  );

  console.log(`✅ Task #${taskId} created in Kanban (running) + logged task_start for ${agent}: ${task}`);
}

async function logComplete() {
  const agent = getArg('agent');
  const task = getArg('task');
  const status = getArg('status') || 'complete';
  const taskId = getArg('task-id'); // Optional: direct task ID

  if (!agent || (!task && !taskId)) {
    console.error('Usage: log-complete --agent <id> --task "<desc>" [--status complete|fail] [--task-id <id>]');
    process.exit(1);
  }

  const finalStatus = status === 'fail' ? 'failed' : 'done';
  const eventType = status === 'fail' ? 'task_fail' : 'task_complete';

  // 1. Update task_queue (Kanban) - find by title+agent or by ID
  let updateResult;
  if (taskId) {
    updateResult = await pool.query(
      `UPDATE ops.task_queue SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING id`,
      [finalStatus, taskId]
    );
  } else {
    updateResult = await pool.query(
      `UPDATE ops.task_queue SET status = $1, completed_at = NOW() 
       WHERE agent_id = $2 AND title = $3 AND status = 'running'
       RETURNING id`,
      [finalStatus, agent, task]
    );
  }

  const updatedTaskId = updateResult.rows[0]?.id;
  
  // 2. Log to agent_events
  const detail = { task: task || `task-${taskId}` };
  await pool.query(
    `INSERT INTO ops.agent_events (agent_id, event_type, detail, task_id) VALUES ($1, $2, $3, $4)`,
    [agent, eventType, JSON.stringify(detail), updatedTaskId || null]
  );

  if (updatedTaskId) {
    console.log(`✅ Task #${updatedTaskId} marked ${finalStatus} in Kanban + logged ${eventType} for ${agent}`);
  } else {
    console.log(`⚠️ No running task found to update, but logged ${eventType} for ${agent}: ${task}`);
  }
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
