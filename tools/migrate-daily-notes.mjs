#!/usr/bin/env node
/**
 * migrate-daily-notes.mjs
 * 
 * Migrates daily log files (YYYY-MM-DD.md) from the file-based memory system
 * to the PostgreSQL memory.daily_notes table.
 * 
 * Features:
 * - Parses date from filename
 * - Handles conflicts (updates existing entries)
 * - Defers embedding generation (sets to NULL for Phase 3)
 * - Comprehensive logging
 * - Dry-run mode support
 * 
 * Usage:
 *   node migrate-daily-notes.mjs [--dry-run] [--limit N] [--log-file PATH]
 * 
 * Examples:
 *   node migrate-daily-notes.mjs --limit 2              # Pilot: migrate 2 files
 *   node migrate-daily-notes.mjs --dry-run              # Test without writing
 *   node migrate-daily-notes.mjs                         # Full migration
 */

import { query, testConnection } from './db-connection.mjs';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { appendFile } from 'fs/promises';

// Configuration
const MEMORY_DIR = '/home/openclaw/.openclaw/workspace/memory';
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/;
const DEFAULT_LOG_FILE = '/tmp/migration-pilot.log';

// Parse command-line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : null;
const logFileIndex = args.indexOf('--log-file');
const logFile = logFileIndex >= 0 ? args[logFileIndex + 1] : DEFAULT_LOG_FILE;

/**
 * Log message to console and file
 */
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  await appendFile(logFile, logMessage);
}

/**
 * Main migration function
 */
async function migrateDailyNotes() {
  await log('=== Daily Notes Migration Started ===');
  await log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  await log(`Limit: ${limit || 'No limit (all files)'}`);
  await log(`Log file: ${logFile}`);
  
  // Test database connection
  await log('Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    await log('ERROR: Database connection failed. Aborting.');
    process.exit(1);
  }
  await log('Database connection successful.');
  
  // Scan for daily log files
  await log(`Scanning directory: ${MEMORY_DIR}`);
  const allFiles = await readdir(MEMORY_DIR);
  const dailyFiles = allFiles
    .filter(f => DATE_PATTERN.test(f))
    .sort(); // Sort chronologically
  
  await log(`Found ${dailyFiles.length} daily log files.`);
  
  // Apply limit if specified
  const filesToMigrate = limit ? dailyFiles.slice(0, limit) : dailyFiles;
  await log(`Migrating ${filesToMigrate.length} files...`);
  
  // Track results
  let success = 0;
  let failed = 0;
  const errors = [];
  
  // Migrate each file
  for (const file of filesToMigrate) {
    const match = file.match(DATE_PATTERN);
    const noteDate = match[1];
    const filePath = join(MEMORY_DIR, file);
    
    try {
      // Read file content
      const content = await readFile(filePath, 'utf-8');
      await log(`Processing: ${file} (${content.length} chars, date: ${noteDate})`);
      
      if (dryRun) {
        await log(`  [DRY RUN] Would insert into daily_notes: ${noteDate}`);
      } else {
        // Insert or update in database
        const result = await query(
          `INSERT INTO memory.daily_notes (note_date, content, embedding)
           VALUES ($1, $2, NULL)
           ON CONFLICT (note_date) DO UPDATE
           SET content = EXCLUDED.content, updated_at = NOW()
           RETURNING id, note_date, created_at, updated_at`,
          [noteDate, content]
        );
        
        const record = result[0];
        await log(`  ✓ Inserted/Updated: ID ${record.id}, date ${record.note_date}`);
      }
      
      success++;
    } catch (error) {
      failed++;
      const errorMsg = `  ✗ Failed to migrate ${file}: ${error.message}`;
      await log(errorMsg);
      errors.push({ file, error: error.message });
    }
  }
  
  // Summary
  await log('=== Migration Summary ===');
  await log(`Total files processed: ${filesToMigrate.length}`);
  await log(`Successful: ${success}`);
  await log(`Failed: ${failed}`);
  
  if (errors.length > 0) {
    await log('\nErrors encountered:');
    for (const err of errors) {
      await log(`  - ${err.file}: ${err.error}`);
    }
  }
  
  if (!dryRun && success > 0) {
    await log('\nValidation check:');
    const countResult = await query('SELECT COUNT(*) FROM memory.daily_notes');
    await log(`Total rows in memory.daily_notes: ${countResult[0].count}`);
  }
  
  await log('=== Daily Notes Migration Complete ===');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run migration
migrateDailyNotes().catch(async (error) => {
  await log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
