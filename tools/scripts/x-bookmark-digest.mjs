#!/usr/bin/env node
/**
 * X Bookmark Weekly Digest
 * 
 * Summarizes bookmarks from the last 7 days and groups by topic/theme.
 * 
 * Usage:
 *   node scripts/x-bookmark-digest.mjs [--days N] [--markdown]
 * 
 * Examples:
 *   node scripts/x-bookmark-digest.mjs
 *   node scripts/x-bookmark-digest.mjs --days 14
 *   node scripts/x-bookmark-digest.mjs --markdown > digest.md
 */

import pg from 'pg';
import dayjs from 'dayjs';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);

const config = {
  days: 7,
  markdown: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--days':
      config.days = parseInt(args[++i], 10);
      break;
    case '--markdown':
    case '--md':
      config.markdown = true;
      break;
    case '--help':
    case '-h':
      console.log(`
X Bookmark Weekly Digest

Usage: node scripts/x-bookmark-digest.mjs [options]

Options:
  --days <number>     Number of days to include (default: 7)
  --markdown, --md    Output as markdown
  --help, -h         Show this help

Examples:
  node scripts/x-bookmark-digest.mjs
  node scripts/x-bookmark-digest.mjs --days 14
  node scripts/x-bookmark-digest.mjs --markdown > digest.md
      `);
      process.exit(0);
  }
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
 * Fetch recent bookmarks
 */
async function fetchRecentBookmarks() {
  const since = dayjs().subtract(config.days, 'day').toDate();
  
  const result = await pool.query(
    `SELECT 
      id,
      tweet_id,
      author,
      author_username,
      text,
      url,
      media_urls,
      bookmarked_at,
      created_at
     FROM ops.x_bookmarks
     WHERE bookmarked_at >= $1
     ORDER BY bookmarked_at DESC`,
    [since]
  );
  
  return result.rows;
}

/**
 * Extract keywords/topics from text
 * Simple keyword extraction - could be enhanced with NLP
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'just', 'now', 'get', 'got', 'like',
    'very', 'really', 'so', 'too', 'more', 'most', 'some', 'any', 'all',
  ]);
  
  // Extract words (2+ chars, alphanumeric)
  const words = text.toLowerCase()
    .match(/\b[a-z]{2,}\b/g) || [];
  
  // Filter stop words and count occurrences
  const wordCounts = {};
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  
  // Return top 5 keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Group bookmarks by topic
 */
function groupByTopic(bookmarks) {
  const topics = {};
  
  for (const bookmark of bookmarks) {
    const keywords = extractKeywords(bookmark.text);
    const primaryTopic = keywords[0] || 'Miscellaneous';
    
    if (!topics[primaryTopic]) {
      topics[primaryTopic] = [];
    }
    
    topics[primaryTopic].push(bookmark);
  }
  
  // Sort topics by number of bookmarks
  const sortedTopics = Object.entries(topics)
    .sort((a, b) => b[1].length - a[1].length);
  
  return Object.fromEntries(sortedTopics);
}

/**
 * Generate markdown digest
 */
function generateMarkdown(bookmarks, topics) {
  const lines = [];
  const fromDate = dayjs().subtract(config.days, 'day').format('YYYY-MM-DD');
  const toDate = dayjs().format('YYYY-MM-DD');
  
  lines.push(`# X Bookmarks Digest`);
  lines.push(`**Period:** ${fromDate} to ${toDate} (${config.days} days)\n`);
  lines.push(`**Total:** ${bookmarks.length} bookmarks\n`);
  lines.push(`---\n`);
  
  // Summary by topic
  lines.push(`## 📊 Topics\n`);
  for (const [topic, items] of Object.entries(topics)) {
    lines.push(`- **${topic}**: ${items.length} bookmark${items.length > 1 ? 's' : ''}`);
  }
  lines.push(`\n---\n`);
  
  // Detailed view by topic
  for (const [topic, items] of Object.entries(topics)) {
    lines.push(`## 📁 ${topic} (${items.length})\n`);
    
    for (const bookmark of items) {
      const date = dayjs(bookmark.bookmarked_at).format('MMM D, YYYY');
      const author = bookmark.author_username ? `@${bookmark.author_username}` : bookmark.author || 'Unknown';
      const text = bookmark.text.length > 300 ? bookmark.text.substring(0, 300) + '...' : bookmark.text;
      
      lines.push(`### ${author} · ${date}\n`);
      lines.push(`${text}\n`);
      lines.push(`🔗 [View on X](${bookmark.url})\n`);
      
      if (bookmark.media_urls) {
        try {
          const mediaUrls = JSON.parse(bookmark.media_urls);
          if (mediaUrls.length > 0) {
            lines.push(`🖼️ ${mediaUrls.length} media item(s)\n`);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      lines.push('---\n');
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate plain text digest
 */
function generatePlainText(bookmarks, topics) {
  const lines = [];
  const fromDate = dayjs().subtract(config.days, 'day').format('YYYY-MM-DD');
  const toDate = dayjs().format('YYYY-MM-DD');
  
  lines.push(`╔═══════════════════════════════════════════════════════════════╗`);
  lines.push(`║          📚 X BOOKMARKS DIGEST                                ║`);
  lines.push(`╚═══════════════════════════════════════════════════════════════╝`);
  lines.push(``);
  lines.push(`Period: ${fromDate} to ${toDate} (${config.days} days)`);
  lines.push(`Total: ${bookmarks.length} bookmarks`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📊 TOPICS`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  for (const [topic, items] of Object.entries(topics)) {
    lines.push(`  • ${topic}: ${items.length} bookmark${items.length > 1 ? 's' : ''}`);
  }
  
  lines.push(``);
  
  for (const [topic, items] of Object.entries(topics)) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📁 ${topic.toUpperCase()} (${items.length})`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(``);
    
    for (const bookmark of items) {
      const date = dayjs(bookmark.bookmarked_at).format('MMM D, YYYY');
      const author = bookmark.author_username ? `@${bookmark.author_username}` : bookmark.author || 'Unknown';
      const text = bookmark.text.length > 250 ? bookmark.text.substring(0, 250) + '...' : bookmark.text;
      
      lines.push(`📌 ${author} · ${date}`);
      lines.push(`🔗 ${bookmark.url}`);
      lines.push(``);
      lines.push(`${text}`);
      
      if (bookmark.media_urls) {
        try {
          const mediaUrls = JSON.parse(bookmark.media_urls);
          if (mediaUrls.length > 0) {
            lines.push(`🖼️  ${mediaUrls.length} media item(s)`);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      lines.push(``);
      lines.push(`─────────────────────────────────────────────────────────────`);
      lines.push(``);
    }
  }
  
  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    const bookmarks = await fetchRecentBookmarks();
    
    if (bookmarks.length === 0) {
      console.log(`\n📭 No bookmarks found in the last ${config.days} days.`);
      process.exit(0);
    }
    
    const topics = groupByTopic(bookmarks);
    
    if (config.markdown) {
      console.log(generateMarkdown(bookmarks, topics));
    } else {
      console.log(generatePlainText(bookmarks, topics));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
