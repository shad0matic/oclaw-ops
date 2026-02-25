#!/usr/bin/env node
import pg from 'pg';
import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = '-1003396419207';
const TELEGRAM_TOPIC_ID = '4706'; // Kanban notifications topic

const pool = new pg.Pool({
  connectionString: 'postgresql://openclaw@localhost:5432/openclaw_db?host=/var/run/postgresql',
});

// Status transitions that should notify
const NOTIFY_TRANSITIONS = {
  // Agent picked up task
  'queued→running': { emoji: '🏃', template: 'started' },
  'assigned→running': { emoji: '🏃', template: 'started' },
  
  // Task completed
  'running→done': { emoji: '✅', template: 'completed' },
  'running→review': { emoji: '👀', template: 'ready for review' },
  
  // Task failed
  'running→failed': { emoji: '❌', template: 'failed' },
  
  // New task created
  'null→queued': { emoji: '📥', template: 'created' },
  'null→backlog': { emoji: '📋', template: 'added to backlog' },
};

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: parseInt(TELEGRAM_TOPIC_ID),
    text,
    parse_mode: 'HTML',
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatNotification(payload) {
  const transition = `${payload.old_status}→${payload.new_status}`;
  const config = NOTIFY_TRANSITIONS[transition];
  
  if (!config) return null; // Don't notify for this transition
  
  const agent = payload.agent_id ? ` by <b>${payload.agent_id}</b>` : '';
  const project = payload.project ? ` [${payload.project}]` : '';
  
  return `${config.emoji} <b>${payload.title}</b>${project} ${config.template}${agent}`;
}

async function listen() {
  const client = await pool.connect();
  
  client.on('notification', async (msg) => {
    if (msg.channel !== 'task_events') return;
    
    try {
      const payload = JSON.parse(msg.payload);
      const text = formatNotification(payload);
      
      if (text) {
        await sendTelegram(text);
        console.log(`[${new Date().toISOString()}] Notified: ${payload.task_id} ${payload.old_status}→${payload.new_status}`);
      }
    } catch (err) {
      console.error('Error processing notification:', err);
    }
  });
  
  await client.query('LISTEN task_events');
  console.log('🎧 Listening for task_events...');
  
  // Keep alive
  setInterval(() => client.query('SELECT 1'), 30000);
}

listen().catch(console.error);