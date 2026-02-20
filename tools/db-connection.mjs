/**
 * Database Connection Module for openclaw_db
 * 
 * Provides a reusable connection pool to the PostgreSQL database
 * using Unix socket peer authentication.
 * 
 * Usage:
 *   import { getPool, query, queryOne } from './db-connection.mjs';
 *   
 *   // Execute a query
 *   const results = await query('SELECT * FROM memory.memories WHERE agent_id = $1', ['main']);
 *   
 *   // Get a single result
 *   const memory = await queryOne('SELECT * FROM memory.memories WHERE id = $1', [123]);
 *   
 *   // Get the pool directly for transactions
 *   const pool = getPool();
 *   const client = await pool.connect();
 *   try {
 *     await client.query('BEGIN');
 *     // ... your queries
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */

import pg from 'pg';

const { Pool } = pg;

// Connection configuration using Unix socket for peer authentication
const config = {
  host: '/var/run/postgresql',
  database: 'openclaw_db',
  // No password needed - peer authentication via Unix socket
  // The process user (openclaw) must match the PostgreSQL user
};

let pool = null;

/**
 * Get or create the connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
export function getPool() {
  if (!pool) {
    pool = new Pool(config);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

/**
 * Execute a query and return all results
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function query(text, params = []) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Execute a query and return a single result
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null if not found
 */
export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Close the connection pool
 * Call this when shutting down the application
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testConnection() {
  try {
    const result = await query('SELECT current_database(), current_user, version()');
    console.log('Database connection successful:');
    console.log(`  Database: ${result[0].current_database}`);
    console.log(`  User: ${result[0].current_user}`);
    console.log(`  Version: ${result[0].version.split('\n')[0]}`);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Export the pool instance for direct access if needed
export { pool };
