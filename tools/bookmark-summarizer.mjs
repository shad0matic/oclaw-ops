#!/usr/bin/env node
/**
 * bookmark-summarizer.mjs — Background job for summarizing browser bookmarks
 * 
 * Runs periodically after scraping. Processes bookmarks with content:
 * - Uses L1 models (Haiku or Flash) for cost efficiency
 * - Generates 2-3 sentence summaries
 * - Stores: summary, summarized_at, summary_model
 */

import pg from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pool = new pg.Pool({
  database: process.env.PGDATABASE || 'openclaw_db',
  user: process.env.PGUSER || 'openclaw',
  host: '/var/run/postgresql'
});

const BATCH_SIZE = 10; // Process 10 bookmarks per run
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash-exp'; // L1 model for cost efficiency

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate summary using L1 model
 */
async function generateSummary(title, content, contentType) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Truncate content to avoid token limits (approx 2000 words)
    const truncatedContent = content.slice(0, 8000);
    
    const prompt = `Summarize this ${contentType} in 2-3 sentences. Focus on the main topic and key value/insights.

Title: ${title || 'Untitled'}

Content:
${truncatedContent}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    
    return { success: true, summary };
  } catch (err) {
    return { 
      success: false, 
      error: err.message 
    };
  }
}

/**
 * Main summarization logic
 */
async function summarize() {
  const client = await pool.connect();
  
  try {
    // Fetch scraped bookmarks that haven't been summarized yet
    const result = await client.query(`
      SELECT id, url, title, content, content_type
      FROM ops.browser_bookmarks
      WHERE scraped_at IS NOT NULL
        AND content IS NOT NULL
        AND summary IS NULL
      ORDER BY scraped_at ASC
      LIMIT $1
    `, [BATCH_SIZE]);

    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] Summarizer: No bookmarks to summarize`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Summarizer: Processing ${result.rows.length} bookmark(s)`);

    for (const bookmark of result.rows) {
      const summaryResult = await generateSummary(
        bookmark.title,
        bookmark.content,
        bookmark.content_type || 'article'
      );
      
      if (summaryResult.success) {
        // Update with generated summary
        await client.query(`
          UPDATE ops.browser_bookmarks
          SET 
            summary = $1,
            summarized_at = NOW(),
            summary_model = $2
          WHERE id = $3
        `, [
          summaryResult.summary,
          MODEL_NAME,
          bookmark.id
        ]);

        console.log(`  ✓ #${bookmark.id}: Summarized (${summaryResult.summary.length} chars)`);
      } else {
        console.log(`  ✗ #${bookmark.id}: ${summaryResult.error}`);
      }
      
      // Small delay to avoid rate limits (not strictly necessary with Flash)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

summarize().catch(err => {
  console.error('Summarization failed:', err);
  process.exit(1);
});
