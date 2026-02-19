#!/usr/bin/env node
/**
 * KB Semantic Search
 * 
 * Search bookmarks and insights using semantic similarity.
 * 
 * Usage:
 *   node tools/scripts/kb-search.mjs "query" [options]
 * 
 * Options:
 *   --limit <n>       Number of results (default: 10)
 *   --folder <id>     Filter by folder ID
 *   --type <type>     Filter insights by type: summary, key_point, tool
 *   --bookmarks       Search bookmarks directly (not insights)
 *   --json            Output as JSON
 * 
 * Examples:
 *   node tools/scripts/kb-search.mjs "AI coding tools"
 *   node tools/scripts/kb-search.mjs "machine learning" --limit 20
 *   node tools/scripts/kb-search.mjs "productivity" --type tool
 */

import pg from 'pg';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);

const config = {
  query: '',
  limit: 10,
  folderId: null,
  type: null,
  bookmarks: false,
  json: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    switch (args[i]) {
      case '--limit':
        config.limit = parseInt(args[++i], 10);
        break;
      case '--folder':
        config.folderId = parseInt(args[++i], 10);
        break;
      case '--type':
        config.type = args[++i];
        break;
      case '--bookmarks':
        config.bookmarks = true;
        break;
      case '--json':
        config.json = true;
        break;
      case '--help':
      case '-h':
        console.log(`
KB Semantic Search - Search bookmarks using embeddings

Usage: node tools/scripts/kb-search.mjs "query" [options]

Options:
  --limit <n>       Number of results (default: 10)
  --folder <id>     Filter by folder ID
  --type <type>     Filter insights: summary, key_point, tool
  --bookmarks       Search bookmarks directly
  --json            Output as JSON

Examples:
  node tools/scripts/kb-search.mjs "AI coding tools"
  node tools/scripts/kb-search.mjs "machine learning" --limit 20
        `);
        process.exit(0);
    }
  } else if (!config.query) {
    config.query = args[i];
  }
}

if (!config.query) {
  console.error('❌ Query required. Usage: kb-search.mjs "your query"');
  process.exit(1);
}

// Database connection
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'openclaw',
        database: process.env.PGDATABASE || 'openclaw_db',
        host: '/var/run/postgresql',
      }
);

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search insights
 */
async function searchInsights(queryEmbedding) {
  let query = `
    SELECT 
      ki.id,
      ki.bookmark_id,
      ki.insight_type,
      ki.content,
      ki.metadata,
      xb.author_username,
      xb.url,
      xb.text as bookmark_text,
      1 - (ki.embedding <=> $1::vector) as score
    FROM ops.kb_insights ki
    JOIN ops.x_bookmarks xb ON xb.id = ki.bookmark_id
  `;
  
  const params = [JSON.stringify(queryEmbedding)];
  const conditions = [];
  
  if (config.folderId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM ops.bookmark_folder_items bfi 
      WHERE bfi.bookmark_id = xb.id AND bfi.folder_id = $${params.length + 1}
    )`);
    params.push(config.folderId);
  }
  
  if (config.type) {
    conditions.push(`ki.insight_type = $${params.length + 1}`);
    params.push(config.type);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY ki.embedding <=> $1::vector LIMIT $${params.length + 1}`;
  params.push(config.limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Search bookmarks directly
 */
async function searchBookmarks(queryEmbedding) {
  let query = `
    SELECT 
      xb.id,
      xb.author_username,
      xb.text,
      xb.summary,
      xb.tags,
      xb.url,
      xb.relevance_score,
      1 - (xb.embedding <=> $1::vector) as score
    FROM ops.x_bookmarks xb
    WHERE xb.embedding IS NOT NULL
  `;
  
  const params = [JSON.stringify(queryEmbedding)];
  
  if (config.folderId) {
    query += ` AND EXISTS (
      SELECT 1 FROM ops.bookmark_folder_items bfi 
      WHERE bfi.bookmark_id = xb.id AND bfi.folder_id = $${params.length + 1}
    )`;
    params.push(config.folderId);
  }
  
  query += ` ORDER BY xb.embedding <=> $1::vector LIMIT $${params.length + 1}`;
  params.push(config.limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Format results for display
 */
function formatResults(results, isBookmarks) {
  if (config.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`\n🔍 Search: "${config.query}"`);
  console.log(`📊 Found: ${results.length} results\n`);
  console.log('━'.repeat(70));
  
  for (const r of results) {
    const score = (r.score * 100).toFixed(1);
    
    if (isBookmarks) {
      console.log(`\n📌 @${r.author_username || 'unknown'} (${score}% match)`);
      console.log(`📝 ${r.summary || r.text?.slice(0, 150) + '...'}`);
      if (r.tags) {
        const tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags;
        console.log(`🏷️  ${tags.join(', ')}`);
      }
      console.log(`🔗 ${r.url}`);
    } else {
      console.log(`\n[${r.insight_type.toUpperCase()}] (${score}% match)`);
      console.log(`💡 ${r.content}`);
      console.log(`👤 @${r.author_username || 'unknown'}`);
      console.log(`🔗 ${r.url}`);
    }
    
    console.log('─'.repeat(70));
  }
}

/**
 * Main execution
 */
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable required');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Generating query embedding...');
    const queryEmbedding = await generateEmbedding(config.query);
    
    let results;
    if (config.bookmarks) {
      results = await searchBookmarks(queryEmbedding);
      formatResults(results, true);
    } else {
      results = await searchInsights(queryEmbedding);
      formatResults(results, false);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
