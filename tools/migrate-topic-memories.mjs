#!/usr/bin/env node
/**
 * migrate-topic-memories.mjs
 * 
 * Migrates topic files (non-date-stamped .md files like projects.md, lessons.md)
 * from the file-based memory system to the PostgreSQL memory.memories table.
 * 
 * Features:
 * - Identifies topic files (excluding daily logs and MEMORY.md)
 * - Splits large files into sections by ## headings for granular recall
 * - Extracts tags from filename and content
 * - Assigns importance scores
 * - Defers embedding generation (sets to NULL for Phase 3)
 * - Comprehensive logging
 * - Dry-run mode support
 * 
 * Usage:
 *   node migrate-topic-memories.mjs [--dry-run] [--limit N] [--log-file PATH] [--no-split]
 * 
 * Examples:
 *   node migrate-topic-memories.mjs --limit 2           # Pilot: migrate 2 files
 *   node migrate-topic-memories.mjs --dry-run           # Test without writing
 *   node migrate-topic-memories.mjs --no-split          # Don't split by sections
 */

import { query, testConnection } from './db-connection.mjs';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { appendFile } from 'fs/promises';

// Configuration
const MEMORY_DIR = '/home/openclaw/.openclaw/workspace/memory';
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/;
const EXCLUDE_FILES = ['MEMORY.md'];
const DEFAULT_LOG_FILE = '/tmp/migration-pilot.log';
const SPLIT_THRESHOLD = 1000; // Split files larger than 1000 chars

// Parse command-line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noSplit = args.includes('--no-split');
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
 * Extract tags from filename and content
 */
function extractTags(filename, content) {
  const tags = ['migration']; // Mark all as migration data
  
  // Extract from filename
  const baseName = filename.replace('.md', '').toLowerCase();
  tags.push(baseName);
  
  // Extract common keywords from content
  const keywords = [
    'infrastructure', 'boss', 'kevin', 'agent', 'project',
    'lesson', 'task', 'dashboard', 'database', 'api'
  ];
  
  for (const keyword of keywords) {
    if (content.toLowerCase().includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  // Return unique tags
  return [...new Set(tags)];
}

/**
 * Assign importance score based on file characteristics
 */
function calculateImportance(filename, content) {
  const baseName = filename.toLowerCase();
  
  // High importance for core knowledge files
  if (baseName.includes('lesson') || baseName.includes('agent')) return 9;
  if (baseName.includes('project') || baseName.includes('roster')) return 8;
  
  // Medium-high for analytical content
  if (baseName.includes('analysis') || baseName.includes('profile')) return 7;
  
  // Default medium importance
  return 6;
}

/**
 * Split content by ## headings into sections
 */
function splitBySections(content, filename) {
  if (noSplit || content.length < SPLIT_THRESHOLD) {
    // Don't split - return entire content as one section
    return [{
      heading: filename,
      content: content,
      isWhole: true
    }];
  }
  
  // Split by ## headings (but not # top-level)
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  
  for (const line of lines) {
    // Match ## Heading (but not # or ###)
    const headingMatch = line.match(/^## (.+)$/);
    
    if (headingMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        heading: headingMatch[1].trim(),
        content: line + '\n',
        isWhole: false
      };
    } else {
      // Add line to current section or start accumulating
      if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        // Content before first heading
        if (!currentSection) {
          currentSection = {
            heading: `${filename} (intro)`,
            content: line + '\n',
            isWhole: false
          };
        }
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If no sections found (no ## headings), return whole content
  if (sections.length === 0) {
    return [{
      heading: filename,
      content: content,
      isWhole: true
    }];
  }
  
  return sections;
}

/**
 * Insert a memory into the database
 */
async function insertMemory(content, tags, importance, sourceFile, heading = null) {
  const result = await query(
    `INSERT INTO memory.memories (content, tags, importance, source_file, agent_id, embedding)
     VALUES ($1, $2, $3, $4, 'main', NULL)
     RETURNING id, created_at`,
    [content, tags, importance, sourceFile]
  );
  
  return result[0];
}

/**
 * Main migration function
 */
async function migrateTopicMemories() {
  await log('=== Topic Memories Migration Started ===');
  await log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  await log(`Split sections: ${noSplit ? 'No' : 'Yes (if > 1000 chars)'}`);
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
  
  // Scan for topic files
  await log(`Scanning directory: ${MEMORY_DIR}`);
  const allFiles = await readdir(MEMORY_DIR);
  const topicFiles = allFiles
    .filter(f => 
      f.endsWith('.md') && 
      !DATE_PATTERN.test(f) && 
      !EXCLUDE_FILES.includes(f)
    )
    .sort();
  
  await log(`Found ${topicFiles.length} topic files.`);
  
  // Apply limit if specified
  const filesToMigrate = limit ? topicFiles.slice(0, limit) : topicFiles;
  await log(`Migrating ${filesToMigrate.length} files...`);
  
  // Track results
  let filesProcessed = 0;
  let sectionsInserted = 0;
  let failed = 0;
  const errors = [];
  
  // Migrate each file
  for (const file of filesToMigrate) {
    const filePath = join(MEMORY_DIR, file);
    
    try {
      // Check if it's a regular file (not directory)
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        await log(`Skipping non-file: ${file}`);
        continue;
      }
      
      // Read file content
      const content = await readFile(filePath, 'utf-8');
      const tags = extractTags(file, content);
      const importance = calculateImportance(file, content);
      
      await log(`Processing: ${file} (${content.length} chars)`);
      await log(`  Tags: [${tags.join(', ')}]`);
      await log(`  Importance: ${importance}`);
      
      // Split into sections
      const sections = splitBySections(content, file);
      await log(`  Sections: ${sections.length}`);
      
      // Insert each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionLabel = section.isWhole ? 'whole file' : `section "${section.heading}"`;
        
        if (dryRun) {
          await log(`    [DRY RUN] Would insert ${sectionLabel} (${section.content.length} chars)`);
        } else {
          const record = await insertMemory(
            section.content,
            tags,
            importance,
            file,
            section.heading
          );
          await log(`    ✓ Inserted ${sectionLabel}: ID ${record.id}`);
          sectionsInserted++;
        }
      }
      
      filesProcessed++;
    } catch (error) {
      failed++;
      const errorMsg = `  ✗ Failed to migrate ${file}: ${error.message}`;
      await log(errorMsg);
      errors.push({ file, error: error.message });
    }
  }
  
  // Summary
  await log('=== Migration Summary ===');
  await log(`Total files processed: ${filesProcessed}`);
  await log(`Sections inserted: ${sectionsInserted}`);
  await log(`Failed: ${failed}`);
  
  if (errors.length > 0) {
    await log('\nErrors encountered:');
    for (const err of errors) {
      await log(`  - ${err.file}: ${err.error}`);
    }
  }
  
  if (!dryRun && sectionsInserted > 0) {
    await log('\nValidation check:');
    const countResult = await query('SELECT COUNT(*) FROM memory.memories');
    await log(`Total rows in memory.memories: ${countResult[0].count}`);
    
    const tagsResult = await query(
      `SELECT DISTINCT unnest(tags) as tag FROM memory.memories ORDER BY tag`
    );
    await log(`Unique tags: ${tagsResult.map(r => r.tag).join(', ')}`);
  }
  
  await log('=== Topic Memories Migration Complete ===');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run migration
migrateTopicMemories().catch(async (error) => {
  await log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
