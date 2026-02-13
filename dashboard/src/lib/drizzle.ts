/**
 * Drizzle ORM database connection
 * Uses the same pg.Pool config as before — unix socket, no URL parsing
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import * as pg from 'pg'
import * as schema from './schema'
import * as relations from './relations'

const { Pool } = pg

// Fix BigInt serialization (pg returns bigint for bigserial/COUNT)
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return Number(this)
}

// Lazy-init pool (same pattern as before)
const getPool = (() => {
  let instance: InstanceType<typeof Pool> | null = null
  return () => {
    if (!instance) {
      instance = new Pool({
        user: 'shad',
        database: 'openclaw_db',
        host: '/var/run/postgresql',
        max: 20,
        idleTimeoutMillis: 0,
        connectionTimeoutMillis: 10000,
      })
      instance.on('error', (err: Error) => {
        console.error('PG Pool error:', err.message)
      })
    }
    return instance
  }
})()

// Lazy-init drizzle instance
const getDrizzle = (() => {
  let instance: ReturnType<typeof drizzle> | null = null
  return () => {
    if (!instance) {
      instance = drizzle(getPool(), { schema: { ...schema, ...relations } })
    }
    return instance
  }
})()

// Export typed drizzle instance via proxy for lazy init
export const db = new Proxy({} as ReturnType<typeof getDrizzle>, {
  get(_target, prop) {
    return (getDrizzle() as any)[prop]
  }
})

// Re-export pool for raw SQL when needed (embeddings, complex queries)
export const pool = new Proxy({} as InstanceType<typeof Pool>, {
  get(_target, prop) {
    return (getPool() as any)[prop]
  }
})
