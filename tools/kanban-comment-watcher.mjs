import pg from 'pg';
const { Client } = pg;
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Database connection configuration
// Connect using the Unix socket for peer authentication
const dbConfig = {
  user: process.env.PGUSER || 'openclaw',
  database: process.env.PGDATABASE || 'openclaw_db',
  host: '/var/run/postgresql', // This forces socket connection
};

async function main() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Watcher service connected to PostgreSQL database');

    // Listen for notifications on the 'new_task_comment' channel
    await client.query('LISTEN new_task_comment');
    console.log('Watcher is now listening for new task comments...');

    client.on('notification', async (msg) => {
      if (msg.channel === 'new_task_comment') {
        try {
          const payload = JSON.parse(msg.payload);
          const taskId = payload.task_id;
          const commentId = payload.comment_id;

          console.log(`[Watcher] Received notification for new comment ${commentId} on task ${taskId}.`);

          // Spawn a high-priority agent task using openclaw CLI
          const taskDescription = `A new comment has been posted on a Kanban task. Task ID: ${taskId}, Comment ID: ${commentId}. Please review and respond immediately.`;
          const command = `openclaw sessions spawn --agentId bob --model haiku --label "kanban-comment-responder" --runTimeoutSeconds 300 "${taskDescription}"`;
          
          console.log(`[Watcher] Spawning agent with command: ${command}`);
          const { stdout, stderr } = await execAsync(command);
          
          if (stderr) {
            console.error(`[Watcher] Error spawning agent: ${stderr}`);
          } else {
            console.log(`[Watcher] Successfully spawned agent task. Output: ${stdout}`);
          }

        } catch (error) {
          console.error('[Watcher] Error processing notification:', error);
        }
      }
    });

    // Keep the connection alive
    process.on('SIGINT', async () => {
      console.log('[Watcher] Disconnecting from database...');
      await client.end();
      process.exit(0);
    });

    client.on('error', (err) => {
      console.error('[Watcher] Database client error:', err.stack);
    });

  } catch (error) {
    console.error('[Watcher] Database connection error:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Watcher] Fatal error in watcher script:', err);
  process.exit(1);
});
