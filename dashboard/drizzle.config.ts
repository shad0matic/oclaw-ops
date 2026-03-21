import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: '127.0.0.1',
    user: 'hermes',
    database: 'siftly_db',
    ssl: false,
  },
  schemaFilter: ['ops', 'memory'],
})
