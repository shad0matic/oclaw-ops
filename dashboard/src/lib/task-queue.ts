/**
 * Task queue auto-dispatch logic
 * Manages automatic dispatching of queued tasks when slots free up
 */

import { db, pool } from "@/lib/drizzle"
import { taskQueueInOps, agentSettingsInOps } from "@/lib/schema"
import { eq, and, sql, isNull, or } from "drizzle-orm"

interface ConcurrencySettings {
  maxAgents?: number
  perModel?: Record<string, number>
}

/**
 * Get the maximum concurrent tasks allowed from settings
 */
async function getMaxConcurrentTasks(): Promise<number> {
  try {
    const [settings] = await db
      .select()
      .from(agentSettingsInOps)
      .where(eq(agentSettingsInOps.key, 'concurrency'))
    
    if (!settings) return 6 // Default fallback
    
    const config = settings.value as ConcurrencySettings
    return config.maxAgents || 6
  } catch (error) {
    console.error('[auto-dispatch] Failed to get concurrency settings:', error)
    return 6 // Default fallback
  }
}

/**
 * Get current count of running tasks
 */
async function getRunningTaskCount(): Promise<number> {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM ops.task_queue
      WHERE status = 'running'
    `)
    return rows[0]?.count || 0
  } catch (error) {
    console.error('[auto-dispatch] Failed to get running task count:', error)
    return 0
  }
}

/**
 * Auto-dispatch next queued task if slots are available
 * Called when a task transitions from 'running' to terminal state
 */
export async function autoDispatchNextTask(): Promise<void> {
  try {
    console.log('[auto-dispatch] Checking for available slots...')
    
    // Get current running count and max allowed
    const [runningCount, maxConcurrent] = await Promise.all([
      getRunningTaskCount(),
      getMaxConcurrentTasks()
    ])
    
    console.log(`[auto-dispatch] Running: ${runningCount}/${maxConcurrent}`)
    
    // Check if we have capacity
    if (runningCount >= maxConcurrent) {
      console.log('[auto-dispatch] No slots available')
      return
    }
    
    // Find next planned task (oldest first, prioritize by priority field)
    const nextTask = await db
      .select()
      .from(taskQueueInOps)
      .where(eq(taskQueueInOps.status, 'planned'))
      .orderBy(
        sql`COALESCE(${taskQueueInOps.priority}, 0) DESC`,
        taskQueueInOps.createdAt
      )
      .limit(1)
    
    if (nextTask.length === 0) {
      console.log('[auto-dispatch] No planned tasks in queue')
      return
    }
    
    const task = nextTask[0]
    console.log(`[auto-dispatch] Dispatching task #${task.id}: ${task.title}`)
    
    // Move task to running state
    await db
      .update(taskQueueInOps)
      .set({
        status: 'running',
        startedAt: sql`now()`,
      })
      .where(eq(taskQueueInOps.id, task.id))
    
    console.log(`[auto-dispatch] Task #${task.id} dispatched successfully`)
    
    // Log the auto-dispatch event
    await pool.query(`
      INSERT INTO ops.agent_learnings (agent_type, task_id, learning_text, category)
      VALUES ($1, $2, $3, $4)
    `, [
      'backend',
      Number(task.id),
      `Auto-dispatched task #${task.id} "${task.title}" when slot became available`,
      'automation'
    ])
    
  } catch (error) {
    console.error('[auto-dispatch] Failed to auto-dispatch:', error)
    // Don't throw - auto-dispatch is best-effort and shouldn't break the main flow
  }
}
