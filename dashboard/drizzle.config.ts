import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: '/var/run/postgresql',
    user: 'shad',
    database: 'openclaw_db',
    ssl: false,
  },
  schemaFilter: ['ops', 'memory'],
})
