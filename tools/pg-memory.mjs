#!/usr/bin/env node
/**
 * Postgres memory helper for Kevin.
 * 
 * Usage:
 *   node tools/pg-memory.mjs search "query text" [--limit 5]
 *   node tools/pg-memory.mjs insert --content "..." [--tags tag1,tag2] [--importance 5] [--source file.md] [--agent main]
 *   node tools/pg-memory.mjs log --agent main --type "task_complete" [--detail '{"key":"val"}'] [--tokens 500] [--cost 0.01] [--session "key"]
 *   node tools/pg-memory.mjs daily --date 2026-02-10 --content "..." 
 *   node tools/pg-memory.mjs stats
 */
import pg from 'pg';
import { parseArgs } from 'node:util';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  return (await res.json()).data[0].embedding;
}

function vec(arr) { return `[${arr.join(',')}]`; }

// ── SEARCH ──────────────────────────────────────────────
async function search(query, limit = 5) {
  const embedding = await getEmbedding(query);
  
  // Hybrid: vector similarity + keyword matching
  const result = await pool.query(`
    WITH vector_matches AS (
      SELECT id, content, source_file, tags, importance, agent_id,
             1 - (embedding <=> $1::vector) as vec_score,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as text_score
      FROM memory.memories
      ORDER BY embedding <=> $1::vector
      LIMIT $3 * 3
    )
    SELECT *, 
           (0.6 * vec_score + 0.25 * LEAST(text_score, 1.0) + 0.15 * (importance / 10.0)) as combined_score
    FROM vector_matches
    ORDER BY combined_score DESC
    LIMIT $3
  `, [vec(embedding), query, limit]);
  
  // Also search daily notes
  const dailyResult = await pool.query(`
    SELECT note_date, LEFT(content, 200) as preview,
           1 - (embedding <=> $1::vector) as similarity
    FROM memory.daily_notes
    ORDER BY embedding <=> $1::vector
    LIMIT 2
  `, [vec(embedding)]);
  
  return {
    memories: result.rows.map(r => ({
      id: r.id,
      source: r.source_file,
      tags: r.tags,
      score: parseFloat(r.combined_score).toFixed(3),
      content: r.content.slice(0, 500) + (r.content.length > 500 ? '...' : ''),
    })),
    daily: dailyResult.rows.map(r => ({
      date: r.note_date,
      similarity: parseFloat(r.similarity).toFixed(3),
      preview: r.preview,
    })),
  };
}

// ── INSERT ──────────────────────────────────────────────
async function insert({ content, tags = [], importance = 5, source = null, agent = 'main' }) {
  const embedding = await getEmbedding(content);
  const result = await pool.query(
    `INSERT INTO memory.memories (content, embedding, tags, importance, source_file, agent_id)
     VALUES ($1, $2::vector, $3, $4, $5, $6) RETURNING id`,
    [content, vec(embedding), tags, importance, source, agent]
  );
  return { id: result.rows[0].id, status: 'inserted' };
}

// ── DAILY NOTE ──────────────────────────────────────────
async function upsertDaily({ date, content }) {
  const embedding = await getEmbedding(content);
  const result = await pool.query(
    `INSERT INTO memory.daily_notes (note_date, content, embedding)
     VALUES ($1, $2, $3::vector)
     ON CONFLICT (note_date) DO UPDATE SET content = $2, embedding = $3::vector, updated_at = now()
     RETURNING id`,
    [date, content, vec(embedding)]
  );
  return { id: result.rows[0].id, date, status: 'upserted' };
}

// ── LOG EVENT ───────────────────────────────────────────
async function logEvent({ agent, type, detail = {}, tokens = null, cost = null, session = null }) {
  const result = await pool.query(
    `INSERT INTO ops.agent_events (agent_id, event_type, detail, tokens_used, cost_usd, session_key)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [agent, type, JSON.stringify(detail), tokens, cost, session]
  );
  return { id: result.rows[0].id, status: 'logged' };
}

// ── STATS ───────────────────────────────────────────────
async function stats() {
  const result = await pool.query(`
    SELECT 
      (SELECT count(*) FROM memory.memories) as memories,
      (SELECT count(*) FROM memory.daily_notes) as daily_notes,
      (SELECT count(*) FROM memory.agent_profiles) as agents,
      (SELECT count(*) FROM ops.agent_events) as events,
      (SELECT count(*) FROM ops.tasks) as tasks,
      (SELECT pg_size_pretty(pg_database_size('openclaw_db'))) as db_size
  `);
  return result.rows[0];
}

// ── CLI ─────────────────────────────────────────────────
const command = process.argv[2];

try {
  let output;
  
  switch (command) {
    case 'search': {
      const query = process.argv[3];
      const limitIdx = process.argv.indexOf('--limit');
      const limit = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1]) : 5;
      if (!query) throw new Error('Usage: search "query text" [--limit N]');
      output = await search(query, limit);
      break;
    }
    
    case 'insert': {
      const args = {};
      for (let i = 3; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace('--', '');
        args[key] = process.argv[i + 1];
      }
      if (!args.content) throw new Error('--content required');
      args.tags = args.tags ? args.tags.split(',') : [];
      args.importance = args.importance ? parseInt(args.importance) : 5;
      output = await insert(args);
      break;
    }
    
    case 'daily': {
      const args = {};
      for (let i = 3; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace('--', '');
        args[key] = process.argv[i + 1];
      }
      if (!args.date || !args.content) throw new Error('--date and --content required');
      output = await upsertDaily(args);
      break;
    }
    
    case 'log': {
      const args = {};
      for (let i = 3; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace('--', '');
        args[key] = process.argv[i + 1];
      }
      if (!args.agent || !args.type) throw new Error('--agent and --type required');
      args.detail = args.detail ? JSON.parse(args.detail) : {};
      args.tokens = args.tokens ? parseInt(args.tokens) : null;
      args.cost = args.cost ? parseFloat(args.cost) : null;
      output = await logEvent(args);
      break;
    }
    
    case 'stats': {
      output = await stats();
      break;
    }
    
    default:
      console.error('Commands: search | insert | log | daily | stats');
      process.exit(1);
  }
  
  console.log(JSON.stringify(output, null, 2));
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
