#!/usr/bin/env node
/**
 * kanban-sweep.mjs — Fallback cron job to catch missed LISTEN/NOTIFY events
 * 
 * Runs every 2 minutes via cron. Checks for:
 * - Tasks that changed status in last 3 minutes but weren't acked
 * - Marks them as acked after notifying
 * 
 * This is a safety net — LISTEN/NOTIFY should handle most cases in real-time.
 */

import pg from 'pg';
import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = '-1003396419207';
const TOPIC_ID = '4706';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
  process.exit(1);
}

const pool = new pg.Pool({
  database: process.env.PGDATABASE || 'openclaw_db',
  user: process.env.PGUSER || 'openclaw',
  host: '/var/run/postgresql'
});

function sendTelegramMessage(text) {
  const data = JSON.stringify({
    chat_id: CHAT_ID,
    message_thread_id: TOPIC_ID,
    text,
    parse_mode: 'HTML'
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} - ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function formatNotification(task, prevStatus) {
  const { id, title, status, project, agent_id } = task;
  const projectTag = project ? ` [${project}]` : '';
  const agentTag = agent_id ? ` by <b>${agent_id}</b>` : '';
  
  // Map status to emoji and message
  const statusMap = {
    'assigned': { emoji: '📌', msg: 'assigned' },
    'planned': { emoji: '📝', msg: '→ Planned' },
    'running': { emoji: '🚀', msg: 'started' },
    'review': { emoji: '👀', msg: 'ready for review' },
    'done': { emoji: '✅', msg: 'completed' },
    'failed': { emoji: '❌', msg: 'failed' }
  };
  
  const config = statusMap[status];
  if (!config) return null;
  
  return `${config.emoji} <b>#${id}</b>${projectTag} ${config.msg}${agentTag}\n${title}\n<i>(via sweep)</i>`;
}

async function sweep() {
  const client = await pool.connect();
  
  try {
    // Find task_events in the last 3 minutes that indicate status changes
    // where the task hasn't been chat_acked recently
    const result = await client.query(`
      SELECT DISTINCT ON (t.id)
        t.id, t.title, t.status, t.project, t.agent_id,
        e.from_status, e.created_at as event_at
      FROM ops.task_queue t
      JOIN ops.task_events e ON e.task_id = t.id
      WHERE e.event_type = 'status_change'
        AND e.created_at > NOW() - INTERVAL '3 minutes'
        AND (t.chat_acked_at IS NULL OR t.chat_acked_at < e.created_at)
        AND t.status IN ('assigned', 'planned', 'running', 'review', 'done', 'failed')
      ORDER BY t.id, e.created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] Sweep: no missed events`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Sweep: found ${result.rows.length} unacked task(s)`);
    
    for (const task of result.rows) {
      const message = formatNotification(task, task.from_status);
      if (message) {
        try {
          await sendTelegramMessage(message);
          console.log(`  → Notified #${task.id} (${task.from_status} → ${task.status})`);
          
          // Mark as chat-acked
          await client.query(
            [task.id]
          );
        } catch (err) {
          console.error(`  ✗ Failed to notify #${task.id}:`, err.message);
        }
      }
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

sweep().catch(err => {
  console.error('Sweep failed:', err);
  process.exit(1);
});
