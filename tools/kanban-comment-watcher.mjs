import { createClient } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'your_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
};

async function main() {
  const client = new createClient(dbConfig);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Listen for notifications on the 'new_task_comment' channel
    await client.query('LISTEN new_task_comment');
    console.log('Listening for new_task_comment notifications...');

    client.on('notification', async (msg) => {
      if (msg.channel === 'new_task_comment') {
        try {
          const payload = JSON.parse(msg.payload);
          const taskId = payload.task_id;
          const commentId = payload.comment_id;

          console.log(`New comment on task ${taskId}, comment ID: ${commentId}`);

          // Spawn a high-priority agent task using openclaw CLI
          const command = `openclaw sessions spawn --priority high "A new comment has been posted on a Kanban task. Task ID: ${taskId}, Comment ID: ${commentId}. Please review and respond immediately."`;
          await execAsync(command);
          console.log(`Spawned agent task for task ${taskId}, comment ${commentId}`);
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      }
    });

    // Keep the connection alive
    process.on('SIGINT', async () => {
      console.log('Disconnecting from database...');
      await client.end();
      process.exit(0);
    });
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in watcher:', err);
  process.exit(1);
});
