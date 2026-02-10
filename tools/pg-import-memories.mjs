#!/usr/bin/env node
/**
 * Import markdown memory files into Postgres with OpenAI embeddings.
 * Usage: node tools/pg-import-memories.mjs [--dry-run]
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/home/shad/.openclaw/workspace';
const OPENAI_KEY = process.env.OPENAI_API_KEY || readApiKey();
const DRY_RUN = process.argv.includes('--dry-run');
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

function readApiKey() {
  try {
    const creds = readFileSync('/home/shad/.openclaw/credentials/openai-api-key.json', 'utf8');
    const parsed = JSON.parse(creds);
    return parsed.apiKey || parsed.token || parsed.key;
  } catch {
    // Try env
    return null;
  }
}

async function getEmbedding(text) {
  const trimmed = text.slice(0, 8000); // limit input
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: trimmed }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

function vectorToSQL(vec) {
  return `[${vec.join(',')}]`;
}

async function importMemoryMd(pool) {
  const path = join(WORKSPACE, 'MEMORY.md');
  const content = readFileSync(path, 'utf8');
  
  // Split into sections by ## headings
  const sections = content.split(/^## /m).filter(s => s.trim());
  let imported = 0;
  
  for (const section of sections) {
    const firstLine = section.split('\n')[0].trim();
    const sectionContent = section.trim();
    if (sectionContent.length < 20) continue;
    
    // Check if already imported
    const existing = await pool.query(
      'SELECT id FROM memory.memories WHERE source_file = $1 AND tags @> $2',
      ['MEMORY.md', [firstLine.slice(0, 50)]]
    );
    if (existing.rows.length > 0) {
      console.log(`  ⏭  Already exists: ${firstLine.slice(0, 50)}`);
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`  📝 Would import: ${firstLine.slice(0, 60)} (${sectionContent.length} chars)`);
      continue;
    }
    
    const embedding = await getEmbedding(sectionContent);
    await pool.query(
      `INSERT INTO memory.memories (content, embedding, tags, importance, source_file, agent_id)
       VALUES ($1, $2::vector, $3, $4, $5, $6)`,
      [sectionContent, vectorToSQL(embedding), [firstLine.slice(0, 50)], 8, 'MEMORY.md', 'main']
    );
    imported++;
    console.log(`  ✅ Imported: ${firstLine.slice(0, 60)}`);
  }
  return imported;
}

async function importDailyNotes(pool) {
  const memDir = join(WORKSPACE, 'memory');
  const files = readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  let imported = 0;
  
  for (const file of files) {
    const dateStr = file.replace('.md', '');
    const content = readFileSync(join(memDir, file), 'utf8');
    if (content.trim().length < 20) continue;
    
    // Check if already imported
    const existing = await pool.query(
      'SELECT id FROM memory.daily_notes WHERE note_date = $1',
      [dateStr]
    );
    if (existing.rows.length > 0) {
      console.log(`  ⏭  Already exists: ${file}`);
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`  📝 Would import: ${file} (${content.length} chars)`);
      continue;
    }
    
    const embedding = await getEmbedding(content);
    await pool.query(
      `INSERT INTO memory.daily_notes (note_date, content, embedding)
       VALUES ($1, $2, $3::vector)`,
      [dateStr, content, vectorToSQL(embedding)]
    );
    imported++;
    console.log(`  ✅ Imported: ${file}`);
  }
  return imported;
}

async function importResearchFiles(pool) {
  const memDir = join(WORKSPACE, 'memory');
  const files = readdirSync(memDir).filter(f => f.endsWith('.md') && !/^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  let imported = 0;
  
  for (const file of files) {
    const content = readFileSync(join(memDir, file), 'utf8');
    if (content.trim().length < 20) continue;
    
    const existing = await pool.query(
      'SELECT id FROM memory.memories WHERE source_file = $1',
      [file]
    );
    if (existing.rows.length > 0) {
      console.log(`  ⏭  Already exists: ${file}`);
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`  📝 Would import: ${file} (${content.length} chars)`);
      continue;
    }
    
    // For large files, embed just the first section + summary
    const textToEmbed = content.slice(0, 8000);
    const embedding = await getEmbedding(textToEmbed);
    
    const tags = [file.replace('.md', '')];
    if (file.startsWith('research-')) tags.push('research');
    if (file.startsWith('roadmap-')) tags.push('roadmap');
    
    await pool.query(
      `INSERT INTO memory.memories (content, embedding, tags, importance, source_file, agent_id)
       VALUES ($1, $2::vector, $3, $4, $5, $6)`,
      [content, vectorToSQL(embedding), tags, 6, file, 'main']
    );
    imported++;
    console.log(`  ✅ Imported: ${file}`);
  }
  return imported;
}

async function main() {
  if (!OPENAI_KEY) {
    console.error('❌ No OpenAI API key found');
    process.exit(1);
  }
  
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made\n' : '🚀 Importing memories to Postgres\n');
  
  const pool = new Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });
  
  try {
    console.log('📚 MEMORY.md sections:');
    const memCount = await importMemoryMd(pool);
    
    console.log('\n📅 Daily notes:');
    const dailyCount = await importDailyNotes(pool);
    
    console.log('\n🔬 Research & reference files:');
    const researchCount = await importResearchFiles(pool);
    
    console.log(`\n✅ Done! Imported: ${memCount} memories + ${dailyCount} daily notes + ${researchCount} research files`);
    
    // Show totals
    const totals = await pool.query(`
      SELECT 
        (SELECT count(*) FROM memory.memories) as memories,
        (SELECT count(*) FROM memory.daily_notes) as daily_notes
    `);
    console.log(`📊 DB totals: ${totals.rows[0].memories} memories, ${totals.rows[0].daily_notes} daily notes`);
    
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
