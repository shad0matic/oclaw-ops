#!/usr/bin/env node
/**
 * task-listener.mjs — Postgres LISTEN/NOTIFY → Telegram topic 4706
 * 
 * Listens on 'task_changes' channel and posts alerts for:
 * - New tasks created
 * - Status changes to 'planned' or 'running'
 * 
 * Run as: node task-listener.mjs
 * Or via systemd: task-listener.service
 */

import pg from 'pg';
import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = '-1003396419207';
const TOPIC_ID = '4706';

// Track recently notified to avoid duplicates on reconnect
const recentlyNotified = new Set();
const DEDUP_WINDOW_MS = 60_000; // 1 minute

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
      'Content-Length': data.length
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

function formatNotification(payload) {
  const { task_id, status, prev_status, agent_id, title, project, event } = payload;
  const projectTag = project ? ` [${project}]` : '';
  const agentTag = agent_id ? ` by <b>${agent_id}</b>` : '';
  
  if (event === 'created') {
    return `📋 <b>New Task #${task_id}</b>${projectTag}\n${title}`;
  }
  
  // Status change
  if (status === 'assigned') {
    return `📌 <b>#${task_id}</b>${projectTag} assigned${agentTag}\n${title}`;
  }
  
  if (status === 'planned') {
    return `📝 <b>#${task_id}</b>${projectTag} → Planned${agentTag}\n${title}`;
  }
  
  if (status === 'running') {
    return `🚀 <b>#${task_id}</b>${projectTag} started${agentTag}\n${title}`;
  }
  
  if (status === 'review') {
    return `👀 <b>#${task_id}</b>${projectTag} ready for review\n${title}`;
  }
  
  if (status === 'done') {
    return `✅ <b>#${task_id}</b>${projectTag} completed\n${title}`;
  }
  
  if (status === 'failed') {
    return `❌ <b>#${task_id}</b>${projectTag} failed\n${title}`;
  }
  
  // Other status changes — skip notification
  return null;
}

import fs from 'fs';
import { exec } from 'child_process';

const PENDING_COMMENTS_FILE = '/tmp/task-comments-pending.json';

async function handleTaskComment(pool, payload) {
  const { task_id, comment_id } = payload;
  
  // Fetch comment details
  const { rows } = await pool.query(
    `SELECT tc.*, tq.title as task_title 
     FROM ops.task_comments tc 
     JOIN ops.task_queue tq ON tc.task_id = tq.id
     WHERE tc.id = $1`,
    [comment_id]
  );
  
  if (rows.length === 0) return;
  
  const comment = rows[0];
  
  // Only process Boss comments
  if (comment.author !== 'boss') {
    console.log('Skipping non-boss comment');
    return;
  }
  
  console.log(`🚨 Boss comment on #${task_id}: ${comment.message.slice(0, 50)}...`);
  
  // Write to pending file for Kevin
  let pending = [];
  try {
    const existing = fs.readFileSync(PENDING_COMMENTS_FILE, 'utf8');
    pending = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist or is invalid
  }
  
  pending.push({
    task_id,
    comment_id,
    message: comment.message,
    task_title: comment.task_title,
    created_at: comment.created_at
  });
  
  fs.writeFileSync(PENDING_COMMENTS_FILE, JSON.stringify(pending, null, 2));
  console.log('Written to pending file');
  
  // Wake Kevin immediately via cron wake
  exec('curl -s -X POST http://localhost:18787/api/cron/wake -H "Content-Type: application/json" -d \'{"text":"Boss commented on task - respond immediately","mode":"now"}\'', 
    (err, stdout, stderr) => {
      if (err) console.error('Wake failed:', err.message);
      else console.log('Kevin woken:', stdout);
    }
  );
  
  // Send Telegram alert
  await sendTelegramMessage(`💬 <b>Boss commented on #${task_id}</b>\n${comment.message.slice(0, 200)}`);
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
    process.exit(1);
  }

  // Use a pool for ack queries, separate from listen client
  const pool = new pg.Pool({
    database: process.env.PGDATABASE || 'openclaw_db',
    user: process.env.PGUSER || 'openclaw',
    host: '/var/run/postgresql',
    max: 2
  });

  const client = new pg.Client({
    database: process.env.PGDATABASE || 'openclaw_db',
    user: process.env.PGUSER || 'openclaw',
    host: '/var/run/postgresql'  // Use Unix socket for peer auth
  });

  client.on('error', (err) => {
    console.error('Postgres client error:', err);
    process.exit(1);
  });

  await client.connect();
  console.log('Connected to Postgres');

  await client.query('LISTEN task_changes');
  await client.query('LISTEN new_task_comment');
  console.log('Listening on task_changes + new_task_comment channels...');

  client.on('notification', async (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      console.log('Received:', msg.channel, payload);

      // Handle new task comments - wake Kevin immediately
      if (msg.channel === 'new_task_comment') {
        await handleTaskComment(pool, payload);
        return;
      }

      // Dedup check (memory)
      const dedupKey = `${payload.task_id}-${payload.status}-${payload.event || 'change'}`;
      if (recentlyNotified.has(dedupKey)) {
        console.log('Skipping duplicate (memory):', dedupKey);
        return;
      }
      
      // DB dedup check - skip if already acked for completed tasks
      if (['done', 'failed', 'cancelled'].includes(payload.status)) {
        const { rows } = await pool.query(
          'SELECT acked, chat_acked_at FROM ops.task_queue WHERE id = $1',
          [payload.task_id]
        );
        if (rows[0]?.acked || rows[0]?.chat_acked_at) {
          console.log('Skipping already acked task:', payload.task_id);
          return;
        }
      }
      
      // Check notification log (persistent dedup)
      const { rows: logRows } = await pool.query(
        'SELECT id FROM ops.task_notification_log WHERE task_id = $1 AND event_type = $2',
        [payload.task_id, `status_${payload.status}`]
      );
      if (logRows.length > 0) {
        console.log('Skipping already notified (DB):', payload.task_id, payload.status);
        return;
      }
      
      recentlyNotified.add(dedupKey);
      setTimeout(() => recentlyNotified.delete(dedupKey), DEDUP_WINDOW_MS);

      const message = formatNotification(payload);
      if (message) {
        await sendTelegramMessage(message);
        console.log('Sent notification for task', payload.task_id);
        
        // Log to prevent future duplicates
        await pool.query(
          'INSERT INTO ops.task_notification_log (task_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [payload.task_id, `status_${payload.status}`]
        );
        
        // Mark as chat-acked so sweep doesn't duplicate
        try {
          await pool.query(
            'UPDATE ops.task_queue SET chat_acked_at = NOW(), acked = true WHERE id = $1',
            [payload.task_id]
          );
        } catch (ackErr) {
          console.error('Failed to ack task:', ackErr.message);
        }
      }
    } catch (err) {
      console.error('Error processing notification:', err);
    }
  });

  // Keep alive with periodic ping
  setInterval(() => client.query('SELECT 1'), 30000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await client.end();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
