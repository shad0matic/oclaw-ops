#!/usr/bin/env node
/**
 * migrate-entity-profiles.mjs
 * 
 * Migrates entity profile files (e.g., smaug.md, olya-profile.md) and extracts
 * entities from structured files (e.g., agents.md, minion-roster.md) to the
 * PostgreSQL memory.entities table.
 * 
 * Features:
 * - Identifies entity profile files by naming patterns
 * - Extracts structured entities from roster/agent files
 * - Parses properties from content (role, description, etc.)
 * - Defers embedding generation (sets to NULL for Phase 3)
 * - Handles aliases and entity types
 * - Comprehensive logging
 * - Dry-run mode support
 * 
 * Usage:
 *   node migrate-entity-profiles.mjs [--dry-run] [--limit N] [--log-file PATH]
 * 
 * Examples:
 *   node migrate-entity-profiles.mjs --limit 2          # Pilot: migrate 2 entities
 *   node migrate-entity-profiles.mjs --dry-run          # Test without writing
 */

import { query, testConnection } from './db-connection.mjs';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { appendFile } from 'fs/promises';

// Configuration
const MEMORY_DIR = '/home/openclaw/.openclaw/workspace/memory';
const DEFAULT_LOG_FILE = '/tmp/migration-pilot.log';

// Entity file mappings (filename -> entity config)
const ENTITY_MAPPINGS = {
  'smaug.md': { name: 'Smaug', type: 'person', aliases: ['Сmaug'] },
  'smaug-analysis-2026-02-17.md': { name: 'Smaug Analysis', type: 'document' },
  'smaug-ai-analysis-2026-02-17.md': { name: 'Smaug AI Analysis', type: 'document' },
  'olya-profile.md': { name: 'Olya', type: 'person', aliases: ['Оля'] },
  'olya-model-analysis.md': { name: 'Olya Model Analysis', type: 'document' },
  'minion-roster.md': { type: 'extract_agents' }, // Special handler
  'agents.md': { type: 'extract_agents' }, // Special handler
};

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
 * Extract properties from markdown content
 */
function extractProperties(content, entityName) {
  const properties = {};
  
  // Extract first paragraph as description (after # heading)
  const descMatch = content.match(/^#[^\n]*\n\n(.+?)(?:\n\n|\n#)/s);
  if (descMatch) {
    properties.description = descMatch[1].trim();
  } else {
    // Fallback: first non-heading paragraph
    const lines = content.split('\n').filter(l => !l.startsWith('#'));
    const firstPara = lines.find(l => l.trim().length > 0);
    if (firstPara) {
      properties.description = firstPara.trim();
    }
  }
  
  // Extract role if mentioned
  const roleMatch = content.match(/\b(role|position|title):\s*([^\n]+)/i);
  if (roleMatch) {
    properties.role = roleMatch[2].trim();
  }
  
  // Extract contact info
  const emailMatch = content.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    properties.email = emailMatch[1];
  }
  
  // Extract links
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    links.push({ text: linkMatch[1], url: linkMatch[2] });
  }
  if (links.length > 0) {
    properties.links = links;
  }
  
  // Store snippet of content
  properties.content_snippet = content.substring(0, 500);
  
  return properties;
}

/**
 * Extract agents/people from structured roster files
 */
function extractAgentsFromRoster(content, filename) {
  const agents = [];
  
  // Split by ## headings (each agent/section)
  const sections = content.split(/^## /m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // First line is the name
    const lines = section.split('\n');
    const nameMatch = lines[0].match(/^([^\n#]+)/);
    if (!nameMatch) continue;
    
    const name = nameMatch[1].trim();
    if (!name || name.length < 2) continue;
    
    const properties = extractProperties(section, name);
    
    // Determine entity type
    let entityType = 'agent';
    if (filename.includes('roster')) entityType = 'team_member';
    if (section.toLowerCase().includes('human')) entityType = 'person';
    
    agents.push({
      name,
      type: entityType,
      properties,
      aliases: []
    });
  }
  
  return agents;
}

/**
 * Insert an entity into the database
 */
async function insertEntity(name, entityType, properties, aliases = []) {
  const result = await query(
    `INSERT INTO memory.entities (name, entity_type, aliases, properties, embedding, first_seen_by)
     VALUES ($1, $2, $3, $4, NULL, 'main')
     ON CONFLICT (name, entity_type) DO UPDATE
     SET properties = EXCLUDED.properties, 
         aliases = EXCLUDED.aliases,
         updated_at = NOW()
     RETURNING id, name, entity_type, created_at`,
    [name, entityType, aliases, JSON.stringify(properties)]
  );
  
  return result[0];
}

/**
 * Main migration function
 */
async function migrateEntityProfiles() {
  await log('=== Entity Profiles Migration Started ===');
  await log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  await log(`Limit: ${limit || 'No limit (all entities)'}`);
  await log(`Log file: ${logFile}`);
  
  // Test database connection
  await log('Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    await log('ERROR: Database connection failed. Aborting.');
    process.exit(1);
  }
  await log('Database connection successful.');
  
  // Collect entities to migrate
  const entitiesToMigrate = [];
  
  // Process mapped files
  for (const [filename, config] of Object.entries(ENTITY_MAPPINGS)) {
    const filePath = join(MEMORY_DIR, filename);
    
    try {
      // Check if file exists
      const stats = await stat(filePath);
      if (!stats.isFile()) continue;
      
      const content = await readFile(filePath, 'utf-8');
      
      if (config.type === 'extract_agents') {
        // Special handler: extract multiple entities
        await log(`Extracting agents from: ${filename}`);
        const agents = extractAgentsFromRoster(content, filename);
        await log(`  Found ${agents.length} entities`);
        
        for (const agent of agents) {
          entitiesToMigrate.push({
            name: agent.name,
            type: agent.type,
            properties: agent.properties,
            aliases: agent.aliases,
            sourceFile: filename
          });
        }
      } else {
        // Simple entity: one file = one entity
        const properties = extractProperties(content, config.name);
        properties.source_file = filename;
        
        entitiesToMigrate.push({
          name: config.name,
          type: config.type,
          properties,
          aliases: config.aliases || [],
          sourceFile: filename
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        await log(`Warning: Could not process ${filename}: ${error.message}`);
      }
    }
  }
  
  await log(`Total entities identified: ${entitiesToMigrate.length}`);
  
  // Apply limit if specified
  const finalEntities = limit ? entitiesToMigrate.slice(0, limit) : entitiesToMigrate;
  await log(`Migrating ${finalEntities.length} entities...`);
  
  // Track results
  let success = 0;
  let failed = 0;
  const errors = [];
  
  // Insert each entity
  for (const entity of finalEntities) {
    try {
      await log(`Processing entity: ${entity.name} (${entity.type})`);
      await log(`  Source: ${entity.sourceFile}`);
      await log(`  Aliases: [${entity.aliases.join(', ')}]`);
      
      if (dryRun) {
        await log(`  [DRY RUN] Would insert entity: ${entity.name}`);
      } else {
        const record = await insertEntity(
          entity.name,
          entity.type,
          entity.properties,
          entity.aliases
        );
        await log(`  ✓ Inserted/Updated: ID ${record.id}, created ${record.created_at}`);
      }
      
      success++;
    } catch (error) {
      failed++;
      const errorMsg = `  ✗ Failed to migrate ${entity.name}: ${error.message}`;
      await log(errorMsg);
      errors.push({ entity: entity.name, error: error.message });
    }
  }
  
  // Summary
  await log('=== Migration Summary ===');
  await log(`Total entities processed: ${finalEntities.length}`);
  await log(`Successful: ${success}`);
  await log(`Failed: ${failed}`);
  
  if (errors.length > 0) {
    await log('\nErrors encountered:');
    for (const err of errors) {
      await log(`  - ${err.entity}: ${err.error}`);
    }
  }
  
  if (!dryRun && success > 0) {
    await log('\nValidation check:');
    const countResult = await query('SELECT COUNT(*) FROM memory.entities');
    await log(`Total rows in memory.entities: ${countResult[0].count}`);
    
    const typesResult = await query(
      `SELECT entity_type, COUNT(*) as count 
       FROM memory.entities 
       GROUP BY entity_type 
       ORDER BY count DESC`
    );
    await log('Entity types:');
    for (const row of typesResult) {
      await log(`  - ${row.entity_type}: ${row.count}`);
    }
  }
  
  await log('=== Entity Profiles Migration Complete ===');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run migration
migrateEntityProfiles().catch(async (error) => {
  await log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
