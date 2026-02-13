/**
 * Database exports — backward compatibility layer
 * 
 * During Drizzle migration, both `pool` (raw SQL) and `db` (Drizzle ORM)
 * are available. New code should use `db` from '@/lib/drizzle'.
 * Old code using `pool` from '@/lib/db' continues to work.
 * 
 * After full migration, this file can be deleted and imports updated.
 */
export { pool, db } from './drizzle'
