import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = 'postgresql://shad@localhost/openclaw_db?host=/var/run/postgresql';
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  await migrate(db, { migrationsFolder: 'drizzle' });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
