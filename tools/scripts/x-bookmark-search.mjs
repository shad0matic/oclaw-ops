#!/usr/bin/env node
/**
 * X Bookmark Search
 * 
 * Full-text search across saved X bookmarks.
 * 
 * Usage:
 *   node scripts/x-bookmark-search.mjs <query> [--author username] [--limit N]
 * 
 * Examples:
 *   node scripts/x-bookmark-search.mjs "AI coding"
 *   node scripts/x-bookmark-search.mjs "bookmarks" --author trq212
 *   node scripts/x-bookmark-search.mjs "Claude" --limit 20
 */

import pg from 'pg';
import dayjs from 'dayjs';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
X Bookmark Search

Usage: node scripts/x-bookmark-search.mjs <query> [options]

Options:
  --author <username>    Filter by author username
  --limit <number>       Max results to return (default: 10)
  --json                 Output as JSON
  --help, -h            Show this help

Examples:
  node scripts/x-bookmark-search.mjs "AI coding"
  node scripts/x-bookmark-search.mjs "bookmarks" --author trq212
  node scripts/x-bookmark-search.mjs "Claude" --limit 20
  `);
  process.exit(0);
}

const config = {
  query: '',
  author: null,
  limit: 10,
  json: false,
};

// First arg is the query (can be multiple words)
let queryParts = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    switch (args[i]) {
      case '--author':
        config.author = args[++i];
        break;
      case '--limit':
        config.limit = parseInt(args[++i], 10);
        break;
      case '--json':
        config.json = true;
        break;
    }
  } else {
    queryParts.push(args[i]);
  }
}

config.query = queryParts.join(' ');

if (!config.query) {
  console.error('❌ Error: Query is required');
  process.exit(1);
}

// Database connection
const pool = new Pool({
  user: process.env.PGUSER || 'shad',
  database: process.env.PGDATABASE || 'openclaw_db',
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
});

/**
 * Search bookmarks
 */
async function searchBookmarks() {
  let sql = `
    SELECT 
      id,
      tweet_id,
      author,
      author_username,
      text,
      url,
      media_urls,
      bookmarked_at,
      created_at,
      ts_rank(to_tsvector('english', text), plainto_tsquery('english', $1)) as rank
    FROM ops.x_bookmarks
    WHERE to_tsvector('english', text) @@ plainto_tsquery('english', $1)
  `;
  
  const params = [config.query];
  let paramIndex = 2;
  
  if (config.author) {
    sql += ` AND author_username ILIKE $${paramIndex}`;
    params.push(`%${config.author}%`);
    paramIndex++;
  }
  
  sql += ` ORDER BY rank DESC, created_at DESC LIMIT $${paramIndex}`;
  params.push(config.limit);
  
  const result = await pool.query(sql, params);
  
  return result.rows;
}

/**
 * Format results for display
 */
function formatResults(results) {
  if (config.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`\n🔍 Found ${results.length} matching bookmarks:\n`);
  
  for (const row of results) {
    const date = dayjs(row.bookmarked_at).format('YYYY-MM-DD HH:mm');
    const author = row.author_username ? `@${row.author_username}` : 'Unknown';
    const text = row.text.length > 200 ? row.text.substring(0, 200) + '...' : row.text;
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 ${author} · ${date}`);
    console.log(`🔗 ${row.url}`);
    console.log(`\n${text}\n`);
    
    if (row.media_urls) {
      try {
        const mediaUrls = JSON.parse(row.media_urls);
        if (mediaUrls.length > 0) {
          console.log(`🖼️  Media: ${mediaUrls.length} item(s)`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await searchBookmarks();
    
    if (results.length === 0) {
      console.log(`\n❌ No bookmarks found matching: "${config.query}"`);
      if (config.author) {
        console.log(`   (filtered by author: ${config.author})`);
      }
      process.exit(0);
    }
    
    formatResults(results);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
