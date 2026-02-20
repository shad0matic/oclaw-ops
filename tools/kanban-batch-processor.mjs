// kanban-batch-processor.mjs

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate a summary message from events
function generateSummary(events) {
  if (!events || events.length === 0) {
    return 'No new Kanban events to process.';
  }

  let summary = 'Kanban Updates:\n';
  events.forEach(event => {
    const taskId = event.task_id;
    if (event.event_type === 'status_change') {
      summary += `- Task #${taskId}: Status changed from '${event.old_value}' to '${event.new_value}'.\n`;
    } else if (event.event_type === 'assignment') {
      summary += `- Task #${taskId}: Assigned to ${event.new_value}.\n`;
    } else {
      summary += `- Task #${taskId}: ${event.event_type}.\n`;
    }
  });

  return summary;
}

async function processKanbanEvents() {
  try {
    // Generate a unique batch ID
    const batchId = uuidv4();
    console.log(`Starting batch process with ID: ${batchId}`);

    // Select and lock unprocessed rows
    const { data: events, error } = await supabase
      .from('ops.kanban_notification_queue')
      .select('*')
      .is('processed_at', null)
      .forUpdate({ skipLocked: true });

    if (error) {
      console.error('Error fetching unprocessed events:', error.message);
      return;
    }

    if (!events || events.length === 0) {
      console.log('No unprocessed events found.');
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
      const { error: updateError } = await supabase
        .from('ops.kanban_notification_queue')
        .update({ processed_at: new Date().toISOString(), batch_id: batchId })
        .in('id', eventIds);

      if (updateError) {
        console.error('Error updating processed events:', updateError.message);
      } else {
        console.log(`Successfully updated ${eventIds.length} events with batch ID ${batchId}.`);
      }
    } catch (telegramError) {
      console.error('Error posting to Telegram:', telegramError.message);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

// Run the process
processKanbanEvents();
