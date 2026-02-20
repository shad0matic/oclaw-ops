#!/usr/bin/env node
/**
 * memory-stats-api.mjs — Memory KPIs API Implementation
 * 
 * Provides real-time KPIs for monitoring the 3-tier memory system:
 * - Tier 1: Active Context (prompt tokens, usage percentage)
 * - Tier 2: Memory Flush (flush frequency, intervals)
 * - Tier 3: Long-Term Storage (memory growth, daily notes)
 * 
 * Usage:
 *   # Standalone CLI (JSON output)
 *   node memory-stats-api.mjs [--agent-id main] [--timeframe 1h]
 * 
 *   # As module (for Next.js API route)
 *   import { getMemoryStats } from './memory-stats-api.mjs';
 *   const stats = await getMemoryStats({ agentId: 'main', timeframe: '1h' });
 * 
 * Environment:
 *   PGDATABASE — PostgreSQL database name (default: openclaw_db)
 *   SESSION_STATUS_ENDPOINT — Optional URL to fetch live session metrics
 */

import { getPool, query, queryOne } from './db-connection.mjs';

// Default configuration
const DEFAULT_AGENT_ID = 'main';
const DEFAULT_TIMEFRAME = '1h';
const MODEL_TOKEN_LIMIT = 200000; // Claude Sonnet 4.5 context window
const TARGET_CONTEXT_TOKENS = 30000; // Operational target

// Health thresholds
const THRESHOLDS = {
  tier1: {
    healthy: { max: 0.20 },      // < 20% usage
    warning: { min: 0.20, max: 0.40 },  // 20-40%
    critical: { min: 0.40 }       // > 40%
  },
  tier2: {
    flush_interval: {
      healthy: { min: 15, max: 30 },    // 15-30 min
      warning: { min: 5, max: 60 },      // 5-15 or 30-60 min
      critical: { outside: [5, 60] }     // < 5 or > 60 min
    },
    flush_count_24h: {
      healthy: { min: 30, max: 60 },
      warning: { min: 15, max: 100 },
      critical: { outside: [15, 100] }
    }
  },
  tier3: {
    growth_per_day: {
      healthy: { max: 100 },
      warning: { min: 100, max: 200 },
      critical: { min: 200 }
    }
  }
};

/**
 * Calculate health status based on value and thresholds
 */
function calculateHealth(value, thresholds) {
  if (thresholds.critical) {
    if (thresholds.critical.min !== undefined && value >= thresholds.critical.min) return 'critical';
    if (thresholds.critical.max !== undefined && value <= thresholds.critical.max) return 'critical';
    if (thresholds.critical.outside) {
      const [min, max] = thresholds.critical.outside;
      if (value < min || value > max) return 'critical';
    }
  }
  
  if (thresholds.warning) {
    if (thresholds.warning.min !== undefined && thresholds.warning.max !== undefined) {
      if (value >= thresholds.warning.min && value <= thresholds.warning.max) return 'warning';
    }
    if (thresholds.warning.outside) {
      const [min, max] = thresholds.warning.outside;
      if ((value >= min && value < thresholds.healthy?.min) || 
          (value > thresholds.healthy?.max && value <= max)) return 'warning';
    }
  }
  
  return 'healthy';
}

/**
 * Generate alerts based on metrics and thresholds
 */
function generateAlerts(tier1, tier2, tier3) {
  const alerts = [];
  
  // Tier 1 alerts
  if (tier1.context_health === 'critical') {
    alerts.push({
      severity: 'critical',
      code: 'CONTEXT_HIGH',
      message: `Active context at ${tier1.usage_percentage.toFixed(1)}% of model limit`,
      recommendation: 'Trigger manual memory flush or increase compaction frequency'
    });
  }
  
  // Check for rapid growth
  if (tier1.avg_prompt_tokens_1h && tier1.avg_prompt_tokens_24h) {
    const growthRate = (tier1.avg_prompt_tokens_1h - tier1.avg_prompt_tokens_24h) / tier1.avg_prompt_tokens_24h;
    if (growthRate > 0.5) {
      alerts.push({
        severity: 'warning',
        code: 'CONTEXT_GROWING_FAST',
        message: `Context usage increased ${(growthRate * 100).toFixed(0)}% in last hour`,
        recommendation: 'Monitor for sustained growth; may need to adjust flush frequency'
      });
    }
  }
  
  // Tier 2 alerts
  if (tier2.flush_health === 'critical' || tier2.flush_health === 'warning') {
    if (tier2.avg_flush_interval_minutes < 10) {
      alerts.push({
        severity: tier2.flush_health === 'critical' ? 'critical' : 'warning',
        code: 'FLUSH_TOO_FREQUENT',
        message: `Memory flushes occurring every ${tier2.avg_flush_interval_minutes.toFixed(1)} minutes (expected 15-30 min)`,
        recommendation: 'Check compaction logic; may indicate inefficient summarization'
      });
    } else if (tier2.avg_flush_interval_minutes > 60) {
      alerts.push({
        severity: tier2.flush_health === 'critical' ? 'critical' : 'warning',
        code: 'FLUSH_TOO_RARE',
        message: `Memory flushes occurring every ${tier2.avg_flush_interval_minutes.toFixed(1)} minutes (expected 15-30 min)`,
        recommendation: 'Risk of context overflow; verify flush triggers are working'
      });
    }
  }
  
  // Tier 3 alerts
  if (tier3.storage_health === 'warning' || tier3.storage_health === 'critical') {
    if (tier3.avg_memory_growth_per_day > 150) {
      alerts.push({
        severity: tier3.storage_health === 'critical' ? 'critical' : 'warning',
        code: 'MEMORY_GROWTH_HIGH',
        message: `Memory growth rate at ${tier3.avg_memory_growth_per_day.toFixed(0)} entries/day`,
        recommendation: 'Review memory retention policy; consider archival or pruning'
      });
    }
    
    if (tier3.total_memories > 8000) {
      alerts.push({
        severity: 'warning',
        code: 'STORAGE_LARGE',
        message: `Total memories: ${tier3.total_memories} (approaching scale limits)`,
        recommendation: 'Monitor query performance; consider database optimization'
      });
    }
  }
  
  return alerts;
}

/**
 * Fetch Tier 1 (Active Context) metrics
 * 
 * Note: This is a mock implementation. In production, this would:
 * 1. Call the session_status API endpoint
 * 2. Parse the current prompt token count
 * 3. Fetch cached historical averages from a metrics table
 * 
 * For now, returns simulated data structure
 */
async function getTier1Metrics(agentId, timeframe) {
  // TODO: Integrate with actual session_status API
  // Example integration:
  // const response = await fetch(process.env.SESSION_STATUS_ENDPOINT);
  // const session = await response.json();
  // const currentTokens = session.prompt_tokens;
  
  // Simulated metrics (replace with real implementation)
  const currentTokens = 28543; // Would come from session_status
  const usagePercentage = (currentTokens / MODEL_TOKEN_LIMIT) * 100;
  
  // Historical averages would be tracked in a dedicated metrics table
  // For initial implementation, we can estimate based on memory flush data
  const avgTokens1h = 27821;
  const avgTokens24h = 26234;
  const peakTokens1h = 32156;
  
  const contextHealth = calculateHealth(usagePercentage / 100, THRESHOLDS.tier1);
  
  return {
    current_prompt_tokens: currentTokens,
    model_limit: MODEL_TOKEN_LIMIT,
    usage_percentage: usagePercentage,
    avg_prompt_tokens_1h: avgTokens1h,
    avg_prompt_tokens_24h: avgTokens24h,
    peak_prompt_tokens_1h: peakTokens1h,
    context_health: contextHealth,
    target_tokens: TARGET_CONTEXT_TOKENS
  };
}

/**
 * Fetch Tier 2 (Memory Flush) metrics
 */
async function getTier2Metrics(agentId, timeframe) {
  const sql = `
    SELECT 
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as count_1h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as count_24h,
      MAX(created_at) as last_flush,
      EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'))) / 3600 as hours_span_24h
    FROM memory.memories
    WHERE agent_id = $1 
      AND 'memory-flush' = ANY(tags)
  `;
  
  const result = await queryOne(sql, [agentId]);
  
  if (!result) {
    return {
      flush_count_1h: 0,
      flush_count_24h: 0,
      avg_flush_interval_minutes: null,
      last_flush_timestamp: null,
      flush_health: 'warning'
    };
  }
  
  const count1h = parseInt(result.count_1h) || 0;
  const count24h = parseInt(result.count_24h) || 0;
  const lastFlush = result.last_flush;
  const hoursSpan = parseFloat(result.hours_span_24h) || 24;
  
  // Calculate average interval (in minutes)
  const avgIntervalMinutes = count24h > 1 
    ? (hoursSpan * 60) / (count24h - 1) 
    : null;
  
  const flushHealth = avgIntervalMinutes 
    ? calculateHealth(avgIntervalMinutes, THRESHOLDS.tier2.flush_interval)
    : 'warning';
  
  return {
    flush_count_1h: count1h,
    flush_count_24h: count24h,
    avg_flush_interval_minutes: avgIntervalMinutes,
    last_flush_timestamp: lastFlush,
    flush_health: flushHealth
  };
}

/**
 * Fetch Tier 3 (Long-Term Storage) metrics
 */
async function getTier3Metrics(agentId, timeframe) {
  // Query memories table
  const memoriesSql = `
    SELECT 
      COUNT(*) as total_memories,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as added_1h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as added_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as added_7d
    FROM memory.memories
    WHERE agent_id = $1
  `;
  
  // Query daily_notes table
  const notesSql = `
    SELECT 
      COUNT(*) as total_notes,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as added_7d
    FROM memory.daily_notes
  `;
  
  const [memoriesResult, notesResult] = await Promise.all([
    queryOne(memoriesSql, [agentId]),
    queryOne(notesSql, [])
  ]);
  
  const totalMemories = parseInt(memoriesResult?.total_memories) || 0;
  const added1h = parseInt(memoriesResult?.added_1h) || 0;
  const added24h = parseInt(memoriesResult?.added_24h) || 0;
  const added7d = parseInt(memoriesResult?.added_7d) || 0;
  
  const totalNotes = parseInt(notesResult?.total_notes) || 0;
  const notesAdded7d = parseInt(notesResult?.added_7d) || 0;
  
  // Calculate average growth per day (based on 7-day trend)
  const avgGrowthPerDay = added7d / 7;
  
  const storageHealth = calculateHealth(avgGrowthPerDay, THRESHOLDS.tier3.growth_per_day);
  
  return {
    total_memories: totalMemories,
    memories_added_1h: added1h,
    memories_added_24h: added24h,
    memories_added_7d: added7d,
    total_daily_notes: totalNotes,
    daily_notes_added_7d: notesAdded7d,
    avg_memory_growth_per_day: parseFloat(avgGrowthPerDay.toFixed(1)),
    storage_health: storageHealth
  };
}

/**
 * Main function to retrieve all memory stats
 */
export async function getMemoryStats(options = {}) {
  const agentId = options.agentId || DEFAULT_AGENT_ID;
  const timeframe = options.timeframe || DEFAULT_TIMEFRAME;
  
  try {
    // Fetch all tier metrics in parallel
    const [tier1, tier2, tier3] = await Promise.all([
      getTier1Metrics(agentId, timeframe),
      getTier2Metrics(agentId, timeframe),
      getTier3Metrics(agentId, timeframe)
    ]);
    
    // Generate alerts based on metrics
    const alerts = generateAlerts(tier1, tier2, tier3);
    
    // Determine overall health (worst case across all tiers)
    const healthPriority = { healthy: 0, warning: 1, critical: 2 };
    const worstHealth = [tier1.context_health, tier2.flush_health, tier3.storage_health]
      .reduce((worst, current) => 
        healthPriority[current] > healthPriority[worst] ? current : worst
      );
    
    return {
      agent_id: agentId,
      timestamp: new Date().toISOString(),
      tier1_active_context: tier1,
      tier2_memory_flush: tier2,
      tier3_longterm_storage: tier3,
      overall_health: worstHealth,
      alerts: alerts
    };
    
  } catch (error) {
    console.error('Error fetching memory stats:', error);
    throw error;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse CLI arguments
  let agentId = DEFAULT_AGENT_ID;
  let timeframe = DEFAULT_TIMEFRAME;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent-id' && args[i + 1]) {
      agentId = args[i + 1];
      i++;
    } else if (args[i] === '--timeframe' && args[i + 1]) {
      timeframe = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Memory KPIs API - Usage:

  node memory-stats-api.mjs [options]

Options:
  --agent-id <id>      Agent identifier (default: main)
  --timeframe <tf>     Time window: 1h, 24h, 7d (default: 1h)
  --help, -h           Show this help message

Examples:
  node memory-stats-api.mjs
  node memory-stats-api.mjs --agent-id main --timeframe 24h
      `);
      process.exit(0);
    }
  }
  
  try {
    const stats = await getMemoryStats({ agentId, timeframe });
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Failed to retrieve memory stats:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
