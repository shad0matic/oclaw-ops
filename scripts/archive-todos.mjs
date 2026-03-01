
import postgres from 'postgres';

async function archiveOldTodos() {
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 5,
  });

  try {
    const result = await sql`
      UPDATE ops.todos
      SET
        status = 'archived',
        archived_at = NOW()
      WHERE
        status = 'done'
        AND completed_at < NOW() - INTERVAL '7 days'
    `;

    if (result.count > 0) {
      console.log(`Archived ${result.count} old todos.`);
      await sql`
        INSERT INTO ops.system_logs (source, message, level)
        VALUES ('cron:archive-todos', 'Archived ${result.count} old todos.', 'info')
      `;
    } else {
      console.log('No todos to archive.');
    }
  } catch (error) {
    console.error('Error archiving old todos:', error);
    await sql`
        INSERT INTO ops.system_logs (source, message, level, details)
        VALUES ('cron:archive-todos', 'Error archiving old todos.', 'error', ${error.message})
      `;
  } finally {
    await sql.end();
  }
}

archiveOldTodos();
