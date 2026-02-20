#!/usr/bin/env node
/**
 * memory-flush-to-db.mjs — Memory Flush to Database Integration
 * 
 * Bridges Tier 2 (Memory Flush) to Tier 3 (Long-Term Memory) by inserting
 * memory flush summaries into the `memories` table with optional embeddings.
 * 
 * Usage:
 *   echo "summary text" | node memory-flush-to-db.mjs
 *   node memory-flush-to-db.mjs "summary text"
 *   node memory-flush-to-db.mjs --file summary.txt
 * 
 * Environment Variables:
 *   OPENAI_API_KEY — If set, generates embeddings via OpenAI text-embedding-3-small
 *   PGDATABASE — Postgres database name (default: openclaw_db)
 *   PGUSER — Postgres user (default: openclaw)
 * 
 * Logs errors to: /tmp/memory-flush-to-db.log
 */

import fs from 'fs';
import pg from 'pg';

// Configuration
const LOG_FILE = '/tmp/memory-flush-to-db.log';
const DB_NAME = process.env.PGDATABASE || 'openclaw_db';
const DB_USER = process.env.PGUSER || 'openclaw';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_AGENT_ID = 'main';
const DEFAULT_IMPORTANCE = 7; // Memory flush summaries are important

/**
 * Log error to file with timestamp
 */
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n${error?.stack || error}\n\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
  
  console.error(`[ERROR] ${message}`);
  if (error) console.error(error);
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) {
    return null; // Skip if no API key configured
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data?.[0]?.embedding) {
      throw new Error('Invalid response from OpenAI API: missing embedding data');
    }

    return data.data[0].embedding;
  } catch (error) {
    logError('Failed to generate embedding', error);
    return null; // Continue without embedding rather than failing completely
  }
}

/**
 * Insert memory into database
 */
async function insertMemory(pool, content, embedding = null) {
  try {
    const embeddingArray = embedding ? `[${embedding.join(',')}]` : null;
    
    const query = `
      INSERT INTO memory.memories (
        content,
        embedding,
        agent_id,
        importance,
        tags,
        source_file,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, created_at
    `;

    const values = [
      content,
      embeddingArray,
      DEFAULT_AGENT_ID,
      DEFAULT_IMPORTANCE,
      ['memory-flush'], // Tag to identify flush-generated memories
      'tier2-flush', // Source identifier
    ];

    const result = await pool.query(query, values);
    
    return {
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      hasEmbedding: !!embedding,
    };
  } catch (error) {
    logError('Failed to insert memory into database', error);
    throw error;
  }
}

/**
 * Read input from various sources
 */
async function getInput() {
  const args = process.argv.slice(2);
  
  // Check for --file argument
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    try {
      return fs.readFileSync(filePath, 'utf8').trim();
    } catch (error) {
      logError(`Failed to read file: ${filePath}`, error);
      throw new Error(`Cannot read file: ${filePath}`);
    }
  }
  
  // Check for direct argument
  if (args.length > 0 && !args[0].startsWith('--')) {
    return args.join(' ').trim();
  }
  
  // Read from stdin
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf8').trim();
    if (input) return input;
  }
  
  throw new Error('No input provided. Use: echo "text" | memory-flush-to-db.mjs or memory-flush-to-db.mjs "text"');
}

/**
 * Main execution
 */
async function main() {
  let pool;
  
  try {
    // Get input summary text
    const content = await getInput();
    
    if (!content || content.length === 0) {
      throw new Error('Input content is empty');
    }
    
    console.log(`Processing memory flush (${content.length} chars)...`);
    
    // Connect to database
    pool = new pg.Pool({
      database: DB_NAME,
      user: DB_USER,
      host: '/var/run/postgresql', // Unix socket for peer authentication
      max: 1,
    });
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Connected to database');
    
    // Generate embedding if configured
    let embedding = null;
    if (OPENAI_API_KEY) {
      console.log('Generating embedding...');
      embedding = await generateEmbedding(content);
      if (embedding) {
        console.log(`✓ Generated embedding (${embedding.length} dimensions)`);
      } else {
        console.log('⚠ Embedding generation failed, continuing without embedding');
      }
    } else {
      console.log('⚠ No OPENAI_API_KEY set, skipping embedding generation');
    }
    
    // Insert into database
    console.log('Inserting memory into database...');
    const result = await insertMemory(pool, content, embedding);
    
    console.log('✓ Memory inserted successfully');
    console.log(`  ID: ${result.id}`);
    console.log(`  Created: ${result.created_at}`);
    console.log(`  Has embedding: ${result.hasEmbedding}`);
    console.log(`  Agent: ${DEFAULT_AGENT_ID}`);
    console.log(`  Importance: ${DEFAULT_IMPORTANCE}`);
    
    // Success exit
    process.exit(0);
    
  } catch (error) {
    logError('Fatal error in memory flush integration', error);
    console.error('\n❌ Failed to process memory flush');
    console.error(`Error: ${error.message}`);
    console.error(`See ${LOG_FILE} for details`);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Execute
main();
