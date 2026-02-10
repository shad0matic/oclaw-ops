#!/usr/bin/env node
/**
 * Agent leveling system — @KSimback's 4-level approach.
 * 
 * Levels:
 *   1 = Observer   — can perform tasks, cannot take action autonomously
 *   2 = Advisor    — can recommend + execute on approval
 *   3 = Operator   — autonomous within guardrails, reports daily
 *   4 = Autonomous — full authority in permissioned domains
 * 
 * Usage:
 *   node tools/agent-levels.mjs status [agent-id]
 *   node tools/agent-levels.mjs promote <agent-id> [--reason "..."]
 *   node tools/agent-levels.mjs demote <agent-id> [--reason "..."]
 *   node tools/agent-levels.mjs review <agent-id> --rating 1-5 --summary "..." [--feedback "..."]
 *   node tools/agent-levels.mjs log-task <agent-id> --success|--fail
 *   node tools/agent-levels.mjs history <agent-id>
 */
import pg from 'pg';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

const LEVEL_NAMES = { 1: 'Observer', 2: 'Advisor', 3: 'Operator', 4: 'Autonomous' };
const LEVEL_EMOJI = { 1: '👁️', 2: '💡', 3: '⚙️', 4: '🚀' };

// Promotion thresholds
const PROMO_CRITERIA = {
  1: { minTasks: 5, minSuccessRate: 0.8, minTrustScore: 0.6 },   // → L2
  2: { minTasks: 15, minSuccessRate: 0.85, minTrustScore: 0.7 },  // → L3
  3: { minTasks: 50, minSuccessRate: 0.9, minTrustScore: 0.85 },  // → L4
};

// ── STATUS ──────────────────────────────────────────────
async function status(agentId) {
  let query = 'SELECT * FROM memory.agent_profiles';
  const params = [];
  if (agentId) {
    query += ' WHERE agent_id = $1';
    params.push(agentId);
  }
  query += ' ORDER BY agent_id';
  
  const result = await pool.query(query, params);
  return result.rows.map(r => ({
    agent: r.agent_id,
    name: r.name,
    level: `${r.level} ${LEVEL_EMOJI[r.level]} ${LEVEL_NAMES[r.level]}`,
    trust: parseFloat(r.trust_score),
    tasks: `${r.successful_tasks}/${r.total_tasks} (${r.total_tasks > 0 ? Math.round(r.successful_tasks / r.total_tasks * 100) : 0}%)`,
    readyForPromo: checkPromoReady(r),
  }));
}

function checkPromoReady(agent) {
  const criteria = PROMO_CRITERIA[agent.level];
  if (!criteria) return 'Max level';
  const rate = agent.total_tasks > 0 ? agent.successful_tasks / agent.total_tasks : 0;
  if (agent.total_tasks < criteria.minTasks) return `Need ${criteria.minTasks - agent.total_tasks} more tasks`;
  if (rate < criteria.minSuccessRate) return `Success rate ${Math.round(rate * 100)}% < ${criteria.minSuccessRate * 100}%`;
  if (parseFloat(agent.trust_score) < criteria.minTrustScore) return `Trust ${agent.trust_score} < ${criteria.minTrustScore}`;
  return '✅ Ready — needs Boss approval';
}

// ── PROMOTE / DEMOTE ────────────────────────────────────
async function changeLevel(agentId, direction, reason) {
  const agent = await pool.query('SELECT * FROM memory.agent_profiles WHERE agent_id = $1', [agentId]);
  if (agent.rows.length === 0) throw new Error(`Agent "${agentId}" not found`);
  
  const current = agent.rows[0].level;
  const newLevel = direction === 'up' ? Math.min(current + 1, 4) : Math.max(current - 1, 1);
  
  if (newLevel === current) throw new Error(`Already at ${direction === 'up' ? 'max' : 'min'} level`);
  
  // Update profile
  await pool.query(
    'UPDATE memory.agent_profiles SET level = $2, updated_at = now() WHERE agent_id = $1',
    [agentId, newLevel]
  );
  
  // Log review
  await pool.query(`
    INSERT INTO memory.performance_reviews (agent_id, reviewer, output_summary, level_before, level_after, feedback)
    VALUES ($1, 'kevin', $2, $3, $4, $5)
  `, [agentId, `${direction === 'up' ? 'Promoted' : 'Demoted'}: ${reason || 'No reason given'}`, current, newLevel, reason]);
  
  // Log event
  await pool.query(`
    INSERT INTO ops.agent_events (agent_id, event_type, detail)
    VALUES ($1, 'level_change', $2)
  `, [agentId, JSON.stringify({ from: current, to: newLevel, direction, reason })]);
  
  return {
    agent: agentId,
    change: `${LEVEL_EMOJI[current]} L${current} ${LEVEL_NAMES[current]} → ${LEVEL_EMOJI[newLevel]} L${newLevel} ${LEVEL_NAMES[newLevel]}`,
    reason,
  };
}

// ── REVIEW ──────────────────────────────────────────────
async function review(agentId, { rating, summary, feedback }) {
  const agent = await pool.query('SELECT * FROM memory.agent_profiles WHERE agent_id = $1', [agentId]);
  if (agent.rows.length === 0) throw new Error(`Agent "${agentId}" not found`);
  
  // Adjust trust score based on rating (1-5)
  // rating 3 = neutral, <3 decreases, >3 increases
  const trustDelta = (rating - 3) * 0.05;
  const newTrust = Math.max(0, Math.min(1, parseFloat(agent.rows[0].trust_score) + trustDelta));
  
  await pool.query(
    'UPDATE memory.agent_profiles SET trust_score = $2, updated_at = now() WHERE agent_id = $1',
    [agentId, newTrust]
  );
  
  await pool.query(`
    INSERT INTO memory.performance_reviews (agent_id, reviewer, output_summary, rating, level_before, level_after, feedback)
    VALUES ($1, 'kevin', $2, $3, $4, $4, $5)
  `, [agentId, summary, rating, agent.rows[0].level, feedback]);
  
  return { agent: agentId, rating, trustBefore: parseFloat(agent.rows[0].trust_score), trustAfter: newTrust };
}

// ── LOG TASK ────────────────────────────────────────────
async function logTask(agentId, success) {
  const field = success ? 'successful_tasks = successful_tasks + 1, total_tasks = total_tasks + 1' : 'total_tasks = total_tasks + 1';
  await pool.query(
    `UPDATE memory.agent_profiles SET ${field}, updated_at = now() WHERE agent_id = $1`,
    [agentId]
  );
  return { agent: agentId, logged: success ? 'success' : 'fail' };
}

// ── HISTORY ─────────────────────────────────────────────
async function history(agentId) {
  const result = await pool.query(`
    SELECT rating, output_summary, level_before, level_after, feedback, created_at
    FROM memory.performance_reviews WHERE agent_id = $1
    ORDER BY created_at DESC LIMIT 20
  `, [agentId]);
  return result.rows;
}

// ── CLI ─────────────────────────────────────────────────
const command = process.argv[2];

try {
  let output;
  
  switch (command) {
    case 'status': {
      output = await status(process.argv[3] || null);
      break;
    }
    case 'promote': {
      const agentId = process.argv[3];
      const reasonIdx = process.argv.indexOf('--reason');
      const reason = reasonIdx > -1 ? process.argv[reasonIdx + 1] : null;
      if (!agentId) throw new Error('Usage: promote <agent-id> [--reason "..."]');
      output = await changeLevel(agentId, 'up', reason);
      break;
    }
    case 'demote': {
      const agentId = process.argv[3];
      const reasonIdx = process.argv.indexOf('--reason');
      const reason = reasonIdx > -1 ? process.argv[reasonIdx + 1] : null;
      if (!agentId) throw new Error('Usage: demote <agent-id> [--reason "..."]');
      output = await changeLevel(agentId, 'down', reason);
      break;
    }
    case 'review': {
      const agentId = process.argv[3];
      const args = {};
      for (let i = 4; i < process.argv.length; i += 2) {
        args[process.argv[i].replace('--', '')] = process.argv[i + 1];
      }
      if (!agentId || !args.rating || !args.summary) throw new Error('Usage: review <agent-id> --rating N --summary "..." [--feedback "..."]');
      args.rating = parseInt(args.rating);
      output = await review(agentId, args);
      break;
    }
    case 'log-task': {
      const agentId = process.argv[3];
      const success = !process.argv.includes('--fail');
      if (!agentId) throw new Error('Usage: log-task <agent-id> --success|--fail');
      output = await logTask(agentId, success);
      break;
    }
    case 'history': {
      const agentId = process.argv[3];
      if (!agentId) throw new Error('Usage: history <agent-id>');
      output = await history(agentId);
      break;
    }
    default:
      console.error('Commands: status | promote | demote | review | log-task | history');
      process.exit(1);
  }
  
  console.log(JSON.stringify(output, null, 2));
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
