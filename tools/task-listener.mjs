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
  const { task_id, status, prev_status, agent_id, title, event } = payload;
  
  if (event === 'created') {
    return `📋 <b>New Task #${task_id}</b>\n${title}\nStatus: <code>${status}</code>`;
  }
  
  // Status change
  if (status === 'planned') {
    return `📝 <b>Task #${task_id} → Planned</b>\n${title}${agent_id ? `\nAssigned: ${agent_id}` : ''}`;
  }
  
  if (status === 'running') {
    return `🚀 <b>Task #${task_id} → Running</b>\n${title}${agent_id ? `\nAgent: ${agent_id}` : ''}`;
  }
  
  if (status === 'review') {
    return `👀 <b>Task #${task_id} → Review</b>\n${title}`;
  }
  
  if (status === 'done') {
    return `✅ <b>Task #${task_id} → Done</b>\n${title}`;
  }
  
  if (status === 'failed') {
    return `❌ <b>Task #${task_id} → Failed</b>\n${title}`;
  }
  
  // Other status changes — skip notification
  return null;
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
    process.exit(1);
  }

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
      }
    } catch (err) {
      console.error('Error processing notification:', err);
    }
  });

  // Keep alive
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await client.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
