# Task Queue LISTEN/NOTIFY Spec

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  
**Replaces:** `task-ack-watcher.sh` cron job (polling every minute)

---

## Problem

Current approach polls `ops.task_queue` every minute via cron to detect status changes and send notifications. This has:
- 0-60s latency (avg 30s delay)
- Wasted cycles when nothing changed
- Cron complexity

## Solution

Use Postgres LISTEN/NOTIFY for real-time, event-driven notifications.

---

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  task_queue     │──────▶│  PG Trigger      │──────▶│  NOTIFY         │
│  (INSERT/UPDATE)│       │  on status change│       │  'task_events'  │
└─────────────────┘       └──────────────────┘       └────────┬────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │  Node.js        │
                                                     │  Listener       │
                                                     │  (systemd svc)  │
                                                     └────────┬────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │  Telegram       │
                                                     │  Notification   │
                                                     └─────────────────┘
```

---

## Database Changes

### 1. Notification Function

```sql
CREATE OR REPLACE FUNCTION ops.notify_task_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Only notify on status changes we care about
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
      'task_id', NEW.id,
      'title', NEW.title,
      'project', NEW.project,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'agent_id', NEW.agent_id,
      'changed_at', NOW()
    );
    
    PERFORM pg_notify('task_events', payload::text);
  END IF;
  
  -- Also notify on new tasks
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'task_id', NEW.id,
      'title', NEW.title,
      'project', NEW.project,
      'old_status', NULL,
      'new_status', NEW.status,
      'agent_id', NEW.agent_id,
      'changed_at', NOW()
    );
    
    PERFORM pg_notify('task_events', payload::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Trigger

```sql
CREATE TRIGGER task_queue_notify_trigger
AFTER INSERT OR UPDATE ON ops.task_queue
FOR EACH ROW
EXECUTE FUNCTION ops.notify_task_change();
```

---

## Listener Service

### `task-queue-listener.mjs`

```javascript
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
```

---

## Systemd Service

### `/etc/systemd/system/task-queue-listener.service`

```ini
[Unit]
Description=Task Queue LISTEN/NOTIFY Listener
After=postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw/projects/oclaw-ops/tools
ExecStart=/usr/bin/node /home/openclaw/projects/oclaw-ops/tools/task-queue-listener.mjs
Restart=always
RestartSec=5
Environment=TELEGRAM_BOT_TOKEN=<from-env>

[Install]
WantedBy=multi-user.target
```

---

## Migration Plan

1. **Create DB objects** — Run SQL to create function + trigger
2. **Deploy listener** — Create service, test manually first
3. **Test** — Update a task status, verify notification arrives
4. **Remove cron** — Delete `task-ack-watcher.sh` from crontab
5. **Cleanup** — Remove old script

---

## Benefits

| Aspect | Cron (before) | LISTEN/NOTIFY (after) |
|--------|---------------|----------------------|
| Latency | 0-60s | <100ms |
| DB load | Query every min | Zero polling |
| Missed events | Possible | None |
| Complexity | Shell + grep | Single Node.js service |

---

## Future Enhancements

- **Batching** — Debounce rapid status changes (e.g., 500ms window)
- **Filtering** — Per-project notification settings
- **Ack tracking** — Mark notifications as seen in dashboard
- **Multiple channels** — Route different projects to different topics

---

## Questions for Boss

1. Should we also notify on task comments/updates (via `task_events` table)?
2. Keep `task_events` DB logging as audit trail, or purely in-memory notifications?
3. Any status transitions missing from the notify list?
