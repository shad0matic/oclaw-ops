#!/usr/bin/env node
/**
 * X Bookmark Archiver
 * 
 * Fetches Twitter/X bookmarks via bird CLI and saves to Postgres.
 * Uses browser cookies for zero-cost authentication.
 * 
 * Usage:
 *   node scripts/x-bookmarks.mjs [--count N] [--all] [--chrome-profile NAME]
 * 
 * Examples:
 *   node scripts/x-bookmarks.mjs --count 50
 *   node scripts/x-bookmarks.mjs --all --max-pages 10
 *   node scripts/x-bookmarks.mjs --chrome-profile "Default"
 */

import { execSync } from 'child_process';
import pg from 'pg';
import path from 'path';
import os from 'os';
import fs from 'fs';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);
const config = {
  count: 20,
  all: false,
  maxPages: 10,
  chromeProfile: null,
  firefoxProfile: null,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--count':
    case '-n':
      config.count = parseInt(args[++i], 10);
      break;
    case '--all':
      config.all = true;
      break;
    case '--max-pages':
      config.maxPages = parseInt(args[++i], 10);
      break;
    case '--chrome-profile':
      config.chromeProfile = args[++i];
      break;
    case '--firefox-profile':
      config.firefoxProfile = args[++i];
      break;
    case '--help':
    case '-h':
      console.log(`
X Bookmark Archiver

Usage: node scripts/x-bookmarks.mjs [options]

Options:
  --count, -n <number>        Number of bookmarks to fetch (default: 20)
  --all                       Fetch all bookmarks (paged)
  --max-pages <number>        Max pages when using --all (default: 10)
  --chrome-profile <name>     Chrome profile name for cookie extraction
  --firefox-profile <name>    Firefox profile name for cookie extraction
  --help, -h                  Show this help

Examples:
  node scripts/x-bookmarks.mjs --count 50
  node scripts/x-bookmarks.mjs --all --max-pages 10
  node scripts/x-bookmarks.mjs --chrome-profile "Default"
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
 * Fetch bookmarks from bird CLI
 */
function fetchBookmarks() {
  console.log('🔥 Fetching bookmarks from X...');
  
  // Build bird command
  let cmd = 'bird bookmarks';
  
  if (config.all) {
    cmd += ` --all --max-pages ${config.maxPages}`;
  } else {
    cmd += ` -n ${config.count}`;
  }
  
  if (config.chromeProfile) {
    cmd += ` --chrome-profile "${config.chromeProfile}"`;
  }
  
  if (config.firefoxProfile) {
    cmd += ` --firefox-profile "${config.firefoxProfile}"`;
  }
  
  cmd += ' --json';
  
  console.log(`  Running: ${cmd.replace('--json', '').trim()}`);
  
  try {
    // Use temp file to handle large outputs
    const tmpFile = path.join(os.tmpdir(), `x-bookmarks-${Date.now()}.json`);
    execSync(`${cmd} > "${tmpFile}"`, {
      timeout: config.all ? 180000 : 60000, // 3min for --all, 60s otherwise
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    const output = fs.readFileSync(tmpFile, 'utf8');
    fs.unlinkSync(tmpFile); // Clean up
    
    const data = JSON.parse(output);
    
    // bird CLI returns array of tweets
    const bookmarks = Array.isArray(data) ? data : (data.tweets || []);
    
    console.log(`  ✅ Fetched ${bookmarks.length} bookmarks`);
    return bookmarks;
    
  } catch (error) {
    if (error.status === 1 && error.stderr) {
      console.error('❌ bird CLI error:');
      console.error(error.stderr.toString());
    } else {
      console.error('❌ Error fetching bookmarks:', error.message);
    }
    process.exit(1);
  }
}

/**
 * Extract media URLs from tweet
 */
function extractMediaUrls(tweet) {
  const mediaUrls = [];
  
  if (tweet.media && Array.isArray(tweet.media)) {
    for (const item of tweet.media) {
      if (item.url) {
        mediaUrls.push(item.url);
      } else if (item.media_url_https) {
        mediaUrls.push(item.media_url_https);
      }
    }
  }
  
  if (tweet.photos && Array.isArray(tweet.photos)) {
    mediaUrls.push(...tweet.photos);
  }
  
  if (tweet.video && tweet.video.url) {
    mediaUrls.push(tweet.video.url);
  }
  
  return mediaUrls;
}

/**
 * Save bookmarks to database
 */
async function saveBookmarks(bookmarks) {
  console.log(`\n💾 Saving to database...`);
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const tweet of bookmarks) {
    try {
      const tweetId = tweet.id || tweet.id_str;
      const author = tweet.author?.name || tweet.user?.name || null;
      const authorUsername = tweet.author?.screen_name || tweet.user?.screen_name || null;
      const text = tweet.text || tweet.full_text || '';
      const url = `https://x.com/${authorUsername}/status/${tweetId}`;
      const mediaUrls = extractMediaUrls(tweet);
      const createdAt = tweet.created_at ? new Date(tweet.created_at) : null;
      
      // Check if bookmark exists
      const checkResult = await pool.query(
        'SELECT id FROM ops.x_bookmarks WHERE tweet_id = $1',
        [tweetId]
      );
      
      if (checkResult.rows.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE ops.x_bookmarks 
           SET author = $2, author_username = $3, text = $4, url = $5, 
               media_urls = $6, updated_at = NOW(), raw_data = $7
           WHERE tweet_id = $1`,
          [
            tweetId,
            author,
            authorUsername,
            text,
            url,
            JSON.stringify(mediaUrls),
            JSON.stringify(tweet),
          ]
        );
        updated++;
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO ops.x_bookmarks 
           (tweet_id, author, author_username, text, url, media_urls, bookmarked_at, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tweetId,
            author,
            authorUsername,
            text,
            url,
            JSON.stringify(mediaUrls),
            createdAt || new Date(),
            JSON.stringify(tweet),
          ]
        );
        inserted++;
      }
    } catch (error) {
      console.error(`  ⚠️  Error saving tweet ${tweet.id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✅ Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  
  return { inserted, updated, skipped };
}

/**
 * Main execution
 */
async function main() {
  console.log('🐉 X Bookmark Archiver\n');
  
  try {
    const bookmarks = fetchBookmarks();
    
    if (bookmarks.length === 0) {
      console.log('  No bookmarks found.');
      process.exit(0);
    }
    
    const stats = await saveBookmarks(bookmarks);
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`  Total fetched: ${bookmarks.length}`);
    console.log(`  New bookmarks: ${stats.inserted}`);
    console.log(`  Updated: ${stats.updated}`);
    console.log(`  Skipped: ${stats.skipped}`);
    
    // Show total in DB
    const totalResult = await pool.query('SELECT COUNT(*) FROM ops.x_bookmarks');
    console.log(`  Total in database: ${totalResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
