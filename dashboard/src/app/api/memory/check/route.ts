import { pool } from "@/lib/db"
import { NextResponse } from "next/server"
import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"

const WORKSPACE = process.env.HOME + "/.openclaw/workspace"

// GET /api/memory/check — compare flat files with Postgres memories
export async function GET() {
    const results: any = { files: {}, db: {}, diff: [] }

    // Count file-based memories
    const memoryFile = join(WORKSPACE, "MEMORY.md")
    if (existsSync(memoryFile)) {
        const content = readFileSync(memoryFile, "utf8")
        const sections = content.split(/^## /m).filter(s => s.trim().length > 20)
        results.files.memoryMdSections = sections.length
    }

    // Count daily notes
    const memDir = join(WORKSPACE, "memory")
    if (existsSync(memDir)) {
        const dailyFiles = readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith(".md"))
        results.files.dailyNotes = dailyFiles.length
        results.files.latestNote = dailyFiles.sort().pop() || null
    }

    // Count DB memories
    const { rows: [dbStats] } = await pool.query(`
        SELECT 
            count(*) as total,
            count(*) FILTER (WHERE source_file = 'MEMORY.md') as from_memory_md,
            count(*) FILTER (WHERE source_file LIKE 'memory/%') as from_daily,
            count(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
            max(updated_at) as last_synced
        FROM memory.memories WHERE agent_id = 'main'
    `)
    results.db = {
        totalMemories: parseInt(dbStats.total),
        fromMemoryMd: parseInt(dbStats.from_memory_md),
        fromDaily: parseInt(dbStats.from_daily),
        withEmbeddings: parseInt(dbStats.with_embeddings),
        lastSynced: dbStats.last_synced,
    }

    // Entity count
    const { rows: [entityCount] } = await pool.query(`SELECT count(*) as c FROM memory.entities`)
    results.db.entities = parseInt(entityCount.c)

    // Check for drift: files changed since last sync
    const lastSync = new Date(dbStats.last_synced)
    const now = new Date()
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 3600)
    results.syncAge = {
        hours: Math.round(hoursSinceSync * 10) / 10,
        stale: hoursSinceSync > 6,
    }

    // Check if MEMORY.md sections match DB count
    if (results.files.memoryMdSections && results.db.fromMemoryMd) {
        const fileSections = results.files.memoryMdSections
        const dbSections = results.db.fromMemoryMd
        if (fileSections !== dbSections) {
            results.diff.push(`MEMORY.md has ${fileSections} sections but DB has ${dbSections} entries — needs sync`)
        }
    }

    if (results.syncAge.stale) {
        results.diff.push(`Last sync was ${results.syncAge.hours}h ago — consider running memory-sync.mjs`)
    }

    results.healthy = results.diff.length === 0

    return NextResponse.json(results)
}

// POST /api/memory/check — trigger a sync + recall
export async function POST() {
    const { execSync } = await import("child_process")
    
    try {
        // Run memory sync
        const syncOutput = execSync(
            `cd ${WORKSPACE} && OPENAI_API_KEY=${process.env.OPENAI_API_KEY} node scripts/memory-sync.mjs 2>&1`,
            { encoding: "utf8", timeout: 30000 }
        )
        
        // Get updated stats
        const { rows: [stats] } = await pool.query(`
            SELECT count(*) as total, max(updated_at) as last_synced
            FROM memory.memories WHERE agent_id = 'main'
        `)

        return NextResponse.json({
            ok: true,
            syncOutput: syncOutput.trim(),
            totalMemories: parseInt(stats.total),
            lastSynced: stats.last_synced,
        })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}
