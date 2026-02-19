#!/usr/bin/env node
/**
 * KB Extraction Pipeline
 * 
 * Processes X bookmarks to extract summaries and generate embeddings.
 * 
 * Usage:
 *   node tools/scripts/kb-extract.mjs [options]
 * 
 * Options:
 *   --queue [folder_id]  Queue unprocessed bookmarks (optionally from specific folder)
 *   --process [count]    Process queued bookmarks (default: 10)
 *   --status             Show queue statistics
 *   --retry-failed       Retry failed items
 *   --clear-failed       Clear failed items from queue
 *   --embed-only         Only generate embeddings for items with summaries
 * 
 * Examples:
 *   node tools/scripts/kb-extract.mjs --queue
 *   node tools/scripts/kb-extract.mjs --process 50
 *   node tools/scripts/kb-extract.mjs --status
 */

import pg from 'pg';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);

const config = {
  queue: false,
  queueFolderId: null,
  process: false,
  processCount: 10,
  status: false,
  retryFailed: false,
  clearFailed: false,
  embedOnly: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--queue':
      config.queue = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        config.queueFolderId = parseInt(args[++i], 10);
      }
      break;
    case '--process':
      config.process = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        config.processCount = parseInt(args[++i], 10);
      }
      break;
    case '--status':
      config.status = true;
      break;
    case '--retry-failed':
      config.retryFailed = true;
      break;
    case '--clear-failed':
      config.clearFailed = true;
      break;
    case '--embed-only':
      config.embedOnly = true;
      break;
    case '--help':
    case '-h':
      console.log(`
KB Extraction Pipeline - Process bookmarks for summaries and embeddings

Usage: node tools/scripts/kb-extract.mjs [options]

Options:
  --queue [folder_id]  Queue unprocessed bookmarks (optionally from folder)
  --process [count]    Process queued bookmarks (default: 10)
  --status             Show queue statistics
  --retry-failed       Retry failed items
  --clear-failed       Clear failed items from queue
  --embed-only         Only generate embeddings for processed items

Examples:
  node tools/scripts/kb-extract.mjs --queue           # Queue all unprocessed
  node tools/scripts/kb-extract.mjs --process 50      # Process 50 items
  node tools/scripts/kb-extract.mjs --status          # Show stats
      `);
      process.exit(0);
  }
}

// Database connection - use DATABASE_URL or Unix socket
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'openclaw',
        database: process.env.PGDATABASE || 'openclaw_db',
        host: '/var/run/postgresql',
      }
);

// Extraction prompt template
const EXTRACTION_PROMPT = `Analyze this X/Twitter post and extract structured information.

Post:
{text}

Author: @{author}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "1-2 sentence summary of the post",
  "keyPoints": ["bullet point 1", "bullet point 2"],
  "topics": ["topic1", "topic2"],
  "tools": ["tool or product mentioned"],
  "sentiment": "positive" | "neutral" | "negative",
  "relevanceScore": 1-10
}

Rules:
- summary: Concise, captures the main point
- keyPoints: 2-5 main takeaways (empty array if none)
- topics: Category tags like "AI", "coding", "startups" (1-5 topics)
- tools: Products, libraries, services mentioned (empty array if none)
- sentiment: Overall tone of the post
- relevanceScore: 1-10 relevance for a tech founder/developer

Respond with ONLY the JSON object, no markdown or explanation.`;

/**
 * Show queue statistics
 */
async function showStatus() {
  const result = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count
    FROM ops.kb_processing_queue
    GROUP BY status
    ORDER BY status
  `);
  
  const stats = {
    pending: 0,
    processing: 0,
    done: 0,
    failed: 0,
  };
  
  for (const row of result.rows) {
    stats[row.status] = parseInt(row.count);
  }
  
  const totalBookmarks = await pool.query(`SELECT COUNT(*) FROM ops.x_bookmarks`);
  const withSummary = await pool.query(`SELECT COUNT(*) FROM ops.x_bookmarks WHERE summary IS NOT NULL`);
  const withEmbedding = await pool.query(`SELECT COUNT(*) FROM ops.x_bookmarks WHERE embedding IS NOT NULL`);
  const insightsCount = await pool.query(`SELECT COUNT(*) FROM ops.kb_insights`);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          📚 KB EXTRACTION PIPELINE STATUS                     ║
╚═══════════════════════════════════════════════════════════════╝

📊 Queue Status:
   • Pending:    ${stats.pending.toLocaleString()}
   • Processing: ${stats.processing}
   • Done:       ${stats.done.toLocaleString()}
   • Failed:     ${stats.failed}

📚 Bookmarks:
   • Total:         ${parseInt(totalBookmarks.rows[0].count).toLocaleString()}
   • With Summary:  ${parseInt(withSummary.rows[0].count).toLocaleString()}
   • With Embedding: ${parseInt(withEmbedding.rows[0].count).toLocaleString()}

🔍 Insights:
   • Total indexed: ${parseInt(insightsCount.rows[0].count).toLocaleString()}
`);
}

/**
 * Queue unprocessed bookmarks
 */
async function queueBookmarks() {
  let query = `
    INSERT INTO ops.kb_processing_queue (bookmark_id, priority)
    SELECT xb.id, 5
    FROM ops.x_bookmarks xb
    WHERE xb.summary IS NULL
      AND xb.text IS NOT NULL
      AND LENGTH(xb.text) > 10
      AND NOT EXISTS (
        SELECT 1 FROM ops.kb_processing_queue q WHERE q.bookmark_id = xb.id
      )
  `;
  
  if (config.queueFolderId) {
    query = `
      INSERT INTO ops.kb_processing_queue (bookmark_id, priority)
      SELECT xb.id, 5
      FROM ops.x_bookmarks xb
      JOIN ops.bookmark_folder_items bfi ON bfi.bookmark_id = xb.id
      WHERE xb.summary IS NULL
        AND xb.text IS NOT NULL
        AND LENGTH(xb.text) > 10
        AND bfi.folder_id = ${config.queueFolderId}
        AND NOT EXISTS (
          SELECT 1 FROM ops.kb_processing_queue q WHERE q.bookmark_id = xb.id
        )
    `;
  }
  
  query += ` ON CONFLICT (bookmark_id) DO NOTHING`;
  
  const result = await pool.query(query);
  console.log(`✅ Queued ${result.rowCount} bookmarks for processing`);
}

/**
 * Retry failed items
 */
async function retryFailed() {
  const result = await pool.query(`
    UPDATE ops.kb_processing_queue
    SET status = 'pending', last_error = NULL, attempts = 0
    WHERE status = 'failed'
  `);
  console.log(`✅ Reset ${result.rowCount} failed items to pending`);
}

/**
 * Clear failed items
 */
async function clearFailed() {
  const result = await pool.query(`
    DELETE FROM ops.kb_processing_queue WHERE status = 'failed'
  `);
  console.log(`✅ Cleared ${result.rowCount} failed items`);
}

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
      input: text.slice(0, 8000), // Limit input length
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Extract insights using OpenAI GPT-4o-mini
 */
async function extractInsights(text, author) {
  const prompt = EXTRACTION_PROMPT
    .replace('{text}', text)
    .replace('{author}', author || 'unknown');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts structured data from social media posts. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  let content = data.choices[0]?.message?.content || '';
  
  // Clean up response - remove markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON:', content.slice(0, 200));
    throw new Error('Invalid JSON response from OpenAI');
  }
}

/**
 * Process a single bookmark
 */
async function processBookmark(bookmark) {
  const { id, bookmark_id, text, author_username } = bookmark;
  
  // Mark as processing
  await pool.query(`
    UPDATE ops.kb_processing_queue 
    SET status = 'processing', started_at = NOW(), attempts = attempts + 1
    WHERE id = $1
  `, [id]);
  
  try {
    // Extract insights with Gemini
    console.log(`  📝 Extracting insights for bookmark #${bookmark_id}...`);
    const insights = await extractInsights(text, author_username);
    
    // Generate embedding for summary + text
    console.log(`  🔢 Generating embedding...`);
    const embeddingText = `${insights.summary}\n\n${text}`;
    const embedding = await generateEmbedding(embeddingText);
    
    // Update bookmark with summary and embedding
    await pool.query(`
      UPDATE ops.x_bookmarks
      SET 
        summary = $1,
        tags = $2,
        relevance_score = $3,
        processed = true,
        processed_at = NOW(),
        embedding = $4
      WHERE id = $5
    `, [
      insights.summary,
      JSON.stringify(insights.topics),
      insights.relevanceScore,
      JSON.stringify(embedding),
      bookmark_id
    ]);
    
    // Store individual insights
    const insightValues = [];
    
    // Summary insight
    insightValues.push({
      type: 'summary',
      content: insights.summary,
      metadata: { sentiment: insights.sentiment, relevance: insights.relevanceScore }
    });
    
    // Key points
    for (const point of insights.keyPoints || []) {
      insightValues.push({
        type: 'key_point',
        content: point,
        metadata: {}
      });
    }
    
    // Tools mentioned
    for (const tool of insights.tools || []) {
      insightValues.push({
        type: 'tool',
        content: tool,
        metadata: {}
      });
    }
    
    // Insert insights with embeddings
    for (const insight of insightValues) {
      const insightEmbedding = await generateEmbedding(insight.content);
      await pool.query(`
        INSERT INTO ops.kb_insights (bookmark_id, insight_type, content, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        bookmark_id,
        insight.type,
        insight.content,
        JSON.stringify(insightEmbedding),
        JSON.stringify(insight.metadata)
      ]);
    }
    
    // Mark as done
    await pool.query(`
      UPDATE ops.kb_processing_queue 
      SET status = 'done', completed_at = NOW()
      WHERE id = $1
    `, [id]);
    
    console.log(`  ✅ Processed bookmark #${bookmark_id} (${insightValues.length} insights)`);
    return true;
    
  } catch (error) {
    // Mark as failed
    await pool.query(`
      UPDATE ops.kb_processing_queue 
      SET status = 'failed', last_error = $1
      WHERE id = $2
    `, [error.message.slice(0, 500), id]);
    
    console.error(`  ❌ Failed bookmark #${bookmark_id}: ${error.message}`);
    return false;
  }
}

/**
 * Process queued bookmarks
 */
async function processQueue() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable required');
    process.exit(1);
  }
  
  // Get pending items with bookmark data
  const result = await pool.query(`
    SELECT 
      q.id,
      q.bookmark_id,
      xb.text,
      xb.author_username
    FROM ops.kb_processing_queue q
    JOIN ops.x_bookmarks xb ON xb.id = q.bookmark_id
    WHERE q.status = 'pending'
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT $1
  `, [config.processCount]);
  
  if (result.rows.length === 0) {
    console.log('📭 No pending items in queue');
    return;
  }
  
  console.log(`\n🚀 Processing ${result.rows.length} bookmarks...\n`);
  
  let processed = 0;
  let failed = 0;
  
  for (const bookmark of result.rows) {
    const success = await processBookmark(bookmark);
    if (success) {
      processed++;
    } else {
      failed++;
    }
    
    // Rate limiting - 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Results: ${processed} processed, ${failed} failed`);
}

/**
 * Generate embeddings only for items with summaries but no embeddings
 */
async function embedOnly() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable required');
    process.exit(1);
  }
  
  const result = await pool.query(`
    SELECT id, text, summary
    FROM ops.x_bookmarks
    WHERE summary IS NOT NULL
      AND embedding IS NULL
    LIMIT 100
  `);
  
  if (result.rows.length === 0) {
    console.log('📭 No items need embedding');
    return;
  }
  
  console.log(`\n🔢 Generating embeddings for ${result.rows.length} bookmarks...\n`);
  
  for (const row of result.rows) {
    try {
      const embeddingText = `${row.summary}\n\n${row.text}`;
      const embedding = await generateEmbedding(embeddingText);
      
      await pool.query(`
        UPDATE ops.x_bookmarks SET embedding = $1 WHERE id = $2
      `, [JSON.stringify(embedding), row.id]);
      
      console.log(`  ✅ Embedded bookmark #${row.id}`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Failed #${row.id}: ${error.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    if (config.status) {
      await showStatus();
    } else if (config.queue) {
      await queueBookmarks();
    } else if (config.retryFailed) {
      await retryFailed();
    } else if (config.clearFailed) {
      await clearFailed();
    } else if (config.embedOnly) {
      await embedOnly();
    } else if (config.process) {
      await processQueue();
    } else {
      // Default: show status
      await showStatus();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
