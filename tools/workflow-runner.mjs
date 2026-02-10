#!/usr/bin/env node
/**
 * Workflow runner — executes YAML-defined multi-agent workflows via Postgres.
 * 
 * Usage:
 *   node tools/workflow-runner.mjs register <yaml-file>
 *   node tools/workflow-runner.mjs list
 *   node tools/workflow-runner.mjs run <workflow-name> [--task "description"] [--context '{"key":"val"}']
 *   node tools/workflow-runner.mjs status <run-id>
 *   node tools/workflow-runner.mjs history [--limit 10]
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { parse as parseYaml } from './yaml-lite.mjs';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

// ── REGISTER WORKFLOW ───────────────────────────────────
async function register(yamlPath) {
  const raw = readFileSync(yamlPath, 'utf8');
  const wf = parseYaml(raw);
  
  if (!wf.name || !wf.steps) throw new Error('YAML must have name and steps');
  
  const result = await pool.query(`
    INSERT INTO ops.workflows (name, description, yaml_definition)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET 
      yaml_definition = $3, 
      description = $2,
      version = ops.workflows.version + 1,
      updated_at = now()
    RETURNING id, name, version
  `, [wf.name, wf.description || null, raw]);
  
  return result.rows[0];
}

// ── LIST WORKFLOWS ──────────────────────────────────────
async function list() {
  const result = await pool.query(`
    SELECT id, name, description, version, enabled, 
           (SELECT count(*) FROM ops.runs WHERE workflow_id = w.id) as total_runs
    FROM ops.workflows w ORDER BY name
  `);
  return result.rows;
}

// ── START RUN ───────────────────────────────────────────
async function startRun(workflowName, task, context = {}) {
  // Get workflow
  const wfResult = await pool.query(
    'SELECT id, name, yaml_definition FROM ops.workflows WHERE name = $1 AND enabled = true',
    [workflowName]
  );
  if (wfResult.rows.length === 0) throw new Error(`Workflow "${workflowName}" not found or disabled`);
  
  const wf = wfResult.rows[0];
  const def = parseYaml(wf.yaml_definition);
  
  // Create run
  const runResult = await pool.query(`
    INSERT INTO ops.runs (workflow_id, workflow_name, task, status, context, started_at)
    VALUES ($1, $2, $3, 'running', $4, now())
    RETURNING id
  `, [wf.id, wf.name, task || def.description, JSON.stringify(context)]);
  
  const runId = runResult.rows[0].id;
  
  // Create steps
  for (let i = 0; i < def.steps.length; i++) {
    const step = def.steps[i];
    await pool.query(`
      INSERT INTO ops.steps (run_id, step_name, step_order, agent_id, input, max_retries)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      runId, 
      step.name, 
      i + 1, 
      step.agent || 'main',
      JSON.stringify({ prompt: step.prompt, tools: step.tools || [], verify: step.verify || null }),
      step.retries || 2
    ]);
  }
  
  // Notify listeners
  await pool.query(`NOTIFY workflow_events, '${JSON.stringify({ event: 'run_started', runId })}'`);
  
  return { runId, workflow: wf.name, steps: def.steps.length, status: 'running' };
}

// ── RUN STATUS ──────────────────────────────────────────
async function runStatus(runId) {
  const run = await pool.query('SELECT * FROM ops.runs WHERE id = $1', [runId]);
  if (run.rows.length === 0) throw new Error(`Run ${runId} not found`);
  
  const steps = await pool.query(
    'SELECT step_name, step_order, agent_id, status, retries, error, started_at, completed_at FROM ops.steps WHERE run_id = $1 ORDER BY step_order',
    [runId]
  );
  
  return { run: run.rows[0], steps: steps.rows };
}

// ── HISTORY ─────────────────────────────────────────────
async function history(limit = 10) {
  const result = await pool.query(`
    SELECT r.id, r.workflow_name, r.task, r.status, r.started_at, r.completed_at,
           count(s.id) as total_steps,
           count(s.id) FILTER (WHERE s.status = 'done') as done_steps
    FROM ops.runs r
    LEFT JOIN ops.steps s ON s.run_id = r.id
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT $1
  `, [limit]);
  return result.rows;
}

// ── EXECUTE NEXT STEP (called by Kevin via sessions_spawn) ──
async function executeNextStep(runId) {
  // Find next pending step
  const stepResult = await pool.query(`
    SELECT * FROM ops.steps 
    WHERE run_id = $1 AND status = 'pending'
    ORDER BY step_order LIMIT 1
    FOR UPDATE SKIP LOCKED
  `, [runId]);
  
  if (stepResult.rows.length === 0) {
    // All steps done — check if run is complete
    const remaining = await pool.query(
      "SELECT count(*) as c FROM ops.steps WHERE run_id = $1 AND status NOT IN ('done', 'skipped')",
      [runId]
    );
    if (parseInt(remaining.rows[0].c) === 0) {
      await pool.query(
        "UPDATE ops.runs SET status = 'done', completed_at = now() WHERE id = $1",
        [runId]
      );
      return { status: 'run_complete', runId };
    }
    return { status: 'no_pending_steps', runId };
  }
  
  const step = stepResult.rows[0];
  
  // Mark as running
  await pool.query(
    "UPDATE ops.steps SET status = 'running', started_at = now() WHERE id = $1",
    [step.id]
  );
  
  return {
    status: 'step_ready',
    runId,
    stepId: step.id,
    stepName: step.step_name,
    agent: step.agent_id,
    input: step.input,
    retries: step.retries,
    maxRetries: step.max_retries,
  };
}

// ── COMPLETE STEP ───────────────────────────────────────
async function completeStep(stepId, output, success = true, error = null) {
  const status = success ? 'done' : 'failed';
  await pool.query(`
    UPDATE ops.steps SET status = $2, output = $3, error = $4, completed_at = now()
    WHERE id = $1
  `, [stepId, status, JSON.stringify(output), error]);
  
  // Get run_id for notification
  const step = await pool.query('SELECT run_id FROM ops.steps WHERE id = $1', [stepId]);
  const runId = step.rows[0].run_id;
  
  await pool.query(`NOTIFY workflow_events, '${JSON.stringify({ event: 'step_complete', runId, stepId, status })}'`);
  
  // Log event
  await pool.query(`
    INSERT INTO ops.agent_events (agent_id, event_type, detail, session_key)
    VALUES ((SELECT agent_id FROM ops.steps WHERE id = $1), 'step_complete', $2, null)
  `, [stepId, JSON.stringify({ stepId, runId, status, output: typeof output === 'string' ? output.slice(0, 200) : output })]);
  
  return { stepId, status, runId };
}

// ── CLI ─────────────────────────────────────────────────
const command = process.argv[2];

try {
  let output;
  
  switch (command) {
    case 'register': {
      const yamlPath = process.argv[3];
      if (!yamlPath) throw new Error('Usage: register <yaml-file>');
      output = await register(yamlPath);
      break;
    }
    case 'list': {
      output = await list();
      break;
    }
    case 'run': {
      const name = process.argv[3];
      const taskIdx = process.argv.indexOf('--task');
      const ctxIdx = process.argv.indexOf('--context');
      const task = taskIdx > -1 ? process.argv[taskIdx + 1] : null;
      const context = ctxIdx > -1 ? JSON.parse(process.argv[ctxIdx + 1]) : {};
      if (!name) throw new Error('Usage: run <workflow-name> [--task "..."]');
      output = await startRun(name, task, context);
      break;
    }
    case 'status': {
      const runId = process.argv[3];
      if (!runId) throw new Error('Usage: status <run-id>');
      output = await runStatus(parseInt(runId));
      break;
    }
    case 'history': {
      const limitIdx = process.argv.indexOf('--limit');
      const limit = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1]) : 10;
      output = await history(limit);
      break;
    }
    case 'next-step': {
      const runId = process.argv[3];
      if (!runId) throw new Error('Usage: next-step <run-id>');
      output = await executeNextStep(parseInt(runId));
      break;
    }
    case 'complete-step': {
      const stepId = process.argv[3];
      const outputStr = process.argv[4] || '{}';
      const success = !process.argv.includes('--failed');
      const errIdx = process.argv.indexOf('--error');
      const error = errIdx > -1 ? process.argv[errIdx + 1] : null;
      output = await completeStep(parseInt(stepId), JSON.parse(outputStr), success, error);
      break;
    }
    default:
      console.error('Commands: register | list | run | status | history | next-step | complete-step');
      process.exit(1);
  }
  
  console.log(JSON.stringify(output, null, 2));
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
