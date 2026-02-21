// kanban-batch-processor.mjs

import pg from 'pg';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Use Unix socket for peer authentication
const dbConfig = {
  user: process.env.PGUSER || 'openclaw',
  database: process.env.PGDATABASE || 'openclaw_db',
  host: '/var/run/postgresql'
};

// Function to generate a summary message from events
function generateSummary(events) {
  if (!events || events.length === 0) {
    return 'No new Kanban events to process.';
  }

  let summary = 'Kanban Updates:\n';
  events.forEach(event => {
    const taskId = event.task_id;
    if (event.event_type === 'status_change') {
      summary += `- Task #${taskId}: Status changed from '${event.payload?.from || 'unknown'}' to '${event.payload?.to || 'unknown'}'.\n`;
    } else if (event.event_type === 'assignment_change') {
      summary += `- Task #${taskId}: Assigned to ${event.payload?.new || 'unknown'}.\n`;
    } else {
      summary += `- Task #${taskId}: ${event.event_type}.\n`;
    }
  });

  return summary;
}

async function processKanbanEvents() {
  const client = new pg.Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for batch processing.');

    // Generate a unique batch ID
    const batchId = uuidv4();
    console.log(`Starting batch process with ID: ${batchId}`);

    // Select and lock unprocessed rows
    const query = `
      SELECT * FROM ops.kanban_notification_queue 
      WHERE processed_at IS NULL 
      FOR UPDATE SKIP LOCKED 
      LIMIT 100;
    `;
    const res = await client.query(query);
    const events = res.rows;

    if (!events || events.length === 0) {
      console.log('No unprocessed events found.');
      await client.end();
      return;
    }

    console.log(`Found ${events.length} unprocessed events.`);

    // Generate summary message
    const summaryMessage = generateSummary(events);
    console.log('Summary message:', summaryMessage);

    // Post summary to Telegram using openclaw CLI
    try {
      const command = `openclaw message send --target -1003396419207 --topic 4706 --message "${summaryMessage.replace(/"/g, '\\"')}"`;
      execSync(command, { stdio: 'inherit' });
      console.log('Successfully posted summary to Telegram.');

      // Update processed rows with batch_id and processed_at
      const eventIds = events.map(event => event.id);
      const updateQuery = `
        UPDATE ops.kanban_notification_queue 
        SET processed_at = NOW(), batch_id = $1
        WHERE id = ANY($2);
      `;
      await client.query(updateQuery, [batchId, eventIds]);
      console.log(`Successfully updated ${eventIds.length} events with batch ID ${batchId}.`);
    } catch (telegramError) {
      console.error('Error posting to Telegram:', telegramError.message);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the process
processKanbanEvents();
