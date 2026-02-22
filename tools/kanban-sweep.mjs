#!/usr/bin/env node
/**
 * kanban-sweep.mjs — Fallback cron job to catch missed LISTEN/NOTIFY events
 * 
 * Runs every 2 minutes via cron. Checks for:
 * - Tasks that changed status in last 3 minutes but weren't acked
 * - Uses notification log to prevent duplicate notifications
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
  const agentTag = agent_id ? `\n${agent_id}` : '';
  
  // Map status to emoji and message
  const statusMap = {
    'assigned': { emoji: '📌', msg: 'assigned' },
    'planned': { emoji: '📝', msg: 'planned' },
    'running': { emoji: '🚀', msg: 'started' },
    'review': { emoji: '👀', msg: 'ready for review' },
    'done': { emoji: '✅', msg: 'completed' },
    'failed': { emoji: '❌', msg: 'failed' }
  };
  
  const config = statusMap[status];
  if (!config) return null;
  
  return `${config.emoji} <b>#${id}</b>${projectTag} ${config.msg}${agentTag}\n${title}`;
}

async function sweep() {
  const client = await pool.connect();
  
  try {
    // Find tasks with recent status changes that:
    // 1. Haven't been chat_acked since the change
    // 2. Haven't been notified via this sweep before (check notification log)
    const result = await client.query(`
      SELECT DISTINCT ON (t.id)
        t.id, t.title, t.status, t.project, t.agent_id,
        e.from_status, e.created_at as event_at
      FROM ops.task_queue t
      JOIN ops.task_events e ON e.task_id = t.id
      LEFT JOIN ops.task_notification_log nl 
        ON nl.task_id = t.id AND nl.event_type = 'status_' || t.status
      WHERE e.event_type = 'status_change'
        AND e.created_at > NOW() - INTERVAL '5 minutes'
        AND (t.chat_acked_at IS NULL OR t.chat_acked_at < e.created_at)
        AND t.status IN ('assigned', 'planned', 'running', 'review', 'done', 'failed')
        AND nl.id IS NULL  -- Not already notified for this status
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
          
          // Log this notification to prevent duplicates
          await client.query(`
            INSERT INTO ops.task_notification_log (task_id, event_type)
            VALUES ($1, $2)
            ON CONFLICT (task_id, event_type) DO UPDATE SET notified_at = NOW()
          `, [task.id, `status_${task.status}`]);
          
          // Mark task as chat-acked
          await client.query(`
            UPDATE ops.task_queue 
            SET chat_acked_at = NOW(), acked = true
            WHERE id = $1
          `, [task.id]);
          
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
