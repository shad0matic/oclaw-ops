#!/usr/bin/env node
/**
 * X Bookmark Folder Fetcher
 * 
 * Fetches bookmarks by folder from X and saves to Postgres with folder info.
 * Requires folder IDs to be provided (get them from X web interface).
 * 
 * Usage:
 *   # Import bookmarks from a specific folder
 *   node scripts/x-bookmark-folders.mjs --folder-id <ID> --folder-name "hustles"
 *   
 *   # Import all bookmarks from multiple folders (config file)
 *   node scripts/x-bookmark-folders.mjs --config folders.json
 *   
 *   # List known folders from database
 *   node scripts/x-bookmark-folders.mjs --list
 * 
 * To get folder IDs:
 *   1. Open x.com/i/bookmarks in browser
 *   2. Click on a folder
 *   3. URL will be: x.com/i/bookmarks?folder=1234567890
 *   4. The number is the folder ID
 */

import { execSync } from 'child_process';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { Pool } = pg;

// Config path for Phil's X cookies
const philConfigPath = '/home/shad/.openclaw/phil-config.json';

// Parse CLI args
const args = process.argv.slice(2);
const config = {
  folderId: null,
  folderName: null,
  configFile: null,
  list: false,
  all: true,
  maxPages: 50,
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--folder-id':
      config.folderId = args[++i];
      break;
    case '--folder-name':
      config.folderName = args[++i];
      break;
    case '--config':
      config.configFile = args[++i];
      break;
    case '--list':
      config.list = true;
      break;
    case '--max-pages':
      config.maxPages = parseInt(args[++i], 10);
      break;
    case '--dry-run':
      config.dryRun = true;
      break;
    case '--help':
    case '-h':
      console.log(`
X Bookmark Folder Fetcher

Usage: node scripts/x-bookmark-folders.mjs [options]

Options:
  --folder-id <ID>          X bookmark folder ID
  --folder-name <name>      Name for the folder (stored in DB)
  --config <file>           JSON config with folder mappings
  --list                    List folders found in database
  --max-pages <number>      Max pages to fetch per folder (default: 50)
  --dry-run                 Fetch but don't save to database
  --help, -h                Show this help

Examples:
  # Import a single folder
  node scripts/x-bookmark-folders.mjs --folder-id 1234567890 --folder-name "hustles"
  
  # Use a config file for multiple folders
  node scripts/x-bookmark-folders.mjs --config folders.json
  
  # List existing folders in database
  node scripts/x-bookmark-folders.mjs --list

Config file format (folders.json):
{
  "folders": [
    { "id": "1234567890", "name": "hustles" },
    { "id": "0987654321", "name": "ai-tools" }
  ]
}

To find folder IDs:
  1. Open x.com/i/bookmarks in your browser
  2. Click on a folder in the left sidebar
  3. The URL becomes: x.com/i/bookmarks?folder=1234567890
  4. Copy the number after "folder="
      `);
      process.exit(0);
  }
}

// Database connection - use Unix socket for peer auth
const pool = new Pool({
  user: process.env.PGUSER || 'shad',
  database: process.env.PGDATABASE || 'openclaw_db',
  host: process.env.PGHOST || '/var/run/postgresql',
});

/**
 * Load Phil's X cookies
 */
function loadXCookies() {
  try {
    const data = fs.readFileSync(philConfigPath, 'utf8');
    const config = JSON.parse(data);
    if (!config.auth_token || !config.ct0) {
      throw new Error('Missing auth_token or ct0 in phil-config.json');
    }
    return config;
  } catch (error) {
    console.error('❌ Could not load X cookies from', philConfigPath);
    console.error('   Please configure X cookies in Dashboard → Settings → X/Twitter');
    process.exit(1);
  }
}

/**
 * Fetch bookmarks from a folder using bird CLI
 */
function fetchFolderBookmarks(folderId, folderName, cookies) {
  console.log(`\n📁 Fetching folder: ${folderName} (ID: ${folderId})`);
  
  const cmd = `bird bookmarks --folder-id ${folderId} --all --max-pages ${config.maxPages} --json --auth-token "${cookies.auth_token}" --ct0 "${cookies.ct0}"`;
  
  try {
    const tmpFile = path.join(os.tmpdir(), `x-folder-${folderId}-${Date.now()}.json`);
    execSync(`${cmd} > "${tmpFile}"`, {
      timeout: 300000, // 5 min timeout
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    const output = fs.readFileSync(tmpFile, 'utf8');
    fs.unlinkSync(tmpFile);
    
    const data = JSON.parse(output);
    const bookmarks = Array.isArray(data) ? data : (data.tweets || []);
    
    console.log(`   ✅ Fetched ${bookmarks.length} bookmarks`);
    return bookmarks;
    
  } catch (error) {
    if (error.stderr) {
      console.error('   ❌ bird CLI error:', error.stderr.toString().slice(0, 200));
    } else {
      console.error('   ❌ Error:', error.message);
    }
    return [];
  }
}

/**
 * Save bookmarks with folder info
 */
async function saveBookmarks(bookmarks, folderName) {
  if (config.dryRun) {
    console.log(`   🔍 Dry run - would save ${bookmarks.length} bookmarks`);
    return { inserted: 0, updated: bookmarks.length, skipped: 0 };
  }
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const tweet of bookmarks) {
    try {
      const tweetId = tweet.id || tweet.id_str;
      const author = tweet.author?.name || tweet.user?.name || null;
      const authorUsername = tweet.author?.username || tweet.author?.screen_name || tweet.user?.screen_name || null;
      const text = tweet.text || tweet.full_text || '';
      const url = `https://x.com/${authorUsername}/status/${tweetId}`;
      const mediaUrls = extractMediaUrls(tweet);
      const createdAt = tweet.createdAt ? new Date(tweet.createdAt) : (tweet.created_at ? new Date(tweet.created_at) : null);
      
      // Check if bookmark exists
      const checkResult = await pool.query(
        'SELECT id, x_folder FROM ops.x_bookmarks WHERE tweet_id = $1',
        [tweetId]
      );
      
      if (checkResult.rows.length > 0) {
        // Update with folder info if not already set
        const existingFolder = checkResult.rows[0].x_folder;
        if (!existingFolder || existingFolder !== folderName) {
          await pool.query(
            `UPDATE ops.x_bookmarks 
             SET x_folder = $2, author = $3, author_username = $4, text = $5, 
                 url = $6, media_urls = $7, updated_at = NOW(), raw_data = $8
             WHERE tweet_id = $1`,
            [tweetId, folderName, author, authorUsername, text, url, JSON.stringify(mediaUrls), JSON.stringify(tweet)]
          );
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Insert new with folder
        await pool.query(
          `INSERT INTO ops.x_bookmarks 
           (tweet_id, author, author_username, text, url, media_urls, bookmarked_at, raw_data, x_folder)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [tweetId, author, authorUsername, text, url, JSON.stringify(mediaUrls), createdAt || new Date(), JSON.stringify(tweet), folderName]
        );
        inserted++;
      }
    } catch (error) {
      console.error(`   ⚠️  Error saving tweet ${tweet.id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`   💾 Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  return { inserted, updated, skipped };
}

/**
 * Extract media URLs
 */
function extractMediaUrls(tweet) {
  const mediaUrls = [];
  if (tweet.media && Array.isArray(tweet.media)) {
    for (const item of tweet.media) {
      if (item.url) mediaUrls.push(item.url);
      else if (item.media_url_https) mediaUrls.push(item.media_url_https);
    }
  }
  return mediaUrls;
}

/**
 * List folders in database
 */
async function listFolders() {
  console.log('📂 X Bookmark Folders in Database:\n');
  
  const result = await pool.query(`
    SELECT x_folder, COUNT(*) as count 
    FROM ops.x_bookmarks 
    WHERE x_folder IS NOT NULL AND x_folder != ''
    GROUP BY x_folder 
    ORDER BY count DESC
  `);
  
  if (result.rows.length === 0) {
    console.log('   No folders found. Use --folder-id and --folder-name to import.');
  } else {
    for (const row of result.rows) {
      console.log(`   📁 ${row.x_folder}: ${row.count} bookmarks`);
    }
  }
  
  // Show unmapped
  const unmapped = await pool.query(`
    SELECT COUNT(*) as count FROM ops.x_bookmarks WHERE x_folder IS NULL OR x_folder = ''
  `);
  console.log(`\n   📭 Without folder: ${unmapped.rows[0].count} bookmarks`);
}

/**
 * Main
 */
async function main() {
  console.log('🐦 X Bookmark Folder Fetcher\n');
  
  try {
    if (config.list) {
      await listFolders();
      return;
    }
    
    // Load folders from config file or CLI
    let folders = [];
    
    if (config.configFile) {
      const configData = JSON.parse(fs.readFileSync(config.configFile, 'utf8'));
      folders = configData.folders || [];
    } else if (config.folderId && config.folderName) {
      folders = [{ id: config.folderId, name: config.folderName }];
    } else {
      console.error('❌ Please provide --folder-id and --folder-name, or --config <file>');
      console.error('   Run with --help for usage info.');
      process.exit(1);
    }
    
    if (folders.length === 0) {
      console.error('❌ No folders to process');
      process.exit(1);
    }
    
    // Load X cookies
    const cookies = loadXCookies();
    console.log(`✅ Loaded X cookies for @${cookies.username || 'unknown'}`);
    
    // Process each folder
    let totalInserted = 0;
    let totalUpdated = 0;
    
    for (const folder of folders) {
      const bookmarks = fetchFolderBookmarks(folder.id, folder.name, cookies);
      if (bookmarks.length > 0) {
        const stats = await saveBookmarks(bookmarks, folder.name);
        totalInserted += stats.inserted;
        totalUpdated += stats.updated;
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Folders processed: ${folders.length}`);
    console.log(`   New bookmarks: ${totalInserted}`);
    console.log(`   Updated: ${totalUpdated}`);
    
    // Show folder stats
    await listFolders();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
