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
  console.log('Listening on task_changes channel...');

  client.on('notification', async (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      console.log('Received:', payload);

      // Dedup check
      const dedupKey = `${payload.task_id}-${payload.status}-${payload.event || 'change'}`;
      if (recentlyNotified.has(dedupKey)) {
        console.log('Skipping duplicate:', dedupKey);
        return;
      }
      recentlyNotified.add(dedupKey);
      setTimeout(() => recentlyNotified.delete(dedupKey), DEDUP_WINDOW_MS);

      const message = formatNotification(payload);
      if (message) {
        await sendTelegramMessage(message);
        console.log('Sent notification for task', payload.task_id);
        
        // Mark as chat-acked so sweep doesn't duplicate
        try {
          await pool.query(
            'UPDATE ops.task_queue SET chat_acked_at = NOW() WHERE id = $1',
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
