import { NextResponse } from "next/server"
import { db } from "@/lib/drizzle"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

// POST: Trigger analysis of an X folder
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { x_folder, context, analysis_prompt } = body

    if (!x_folder) {
      return NextResponse.json({ error: "x_folder is required" }, { status: 400 })
    }

    // Get folder info and bookmark count from ops.x_bookmarks (where x_folder column lives)
    const folderResult = await db.execute(sql`
      SELECT 
        fm.x_folder,
        fm.description as project,
        fm.analysis_prompt as saved_prompt
      FROM ops.x_folder_mappings fm
      WHERE fm.x_folder = ${x_folder}
    `)

    // Count bookmarks from ops.x_bookmarks using x_folder column
    const bookmarkCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM ops.x_bookmarks 
      WHERE x_folder = ${x_folder}
    `)

    const bookmarkCount = Number(bookmarkCountResult.rows[0]?.count || 0)

    if (bookmarkCount === 0) {
      return NextResponse.json({ 
        error: "No bookmarks found in this folder" 
      }, { status: 400 })
    }

    // Use provided prompt or saved prompt
    const finalPrompt = analysis_prompt || 
      (folderResult.rows[0] as any)?.saved_prompt || 
      "Analyze these bookmarks and extract key insights, tools mentioned, and actionable items."

    // Create a task for the analysis
    const taskResult = await db.execute(sql`
      INSERT INTO ops.task_queue 
      (title, description, status, agent_id, project, complexity)
      VALUES (
        ${'📊 Analyze X folder: ' + x_folder},
        ${`Analyze ${bookmarkCount} bookmarks from X folder "${x_folder}".

**Context from user:** ${context || 'Not provided'}

**Analysis prompt:** ${finalPrompt}

Steps:
1. Fetch all bookmarks from this folder
2. For each bookmark with video/media, extract transcripts if needed
3. Analyze content according to the prompt
4. Extract insights, tools, resources, actionable items
5. Store findings in knowledge base`},
        'queued',
        'phil',
        'smaug',
        'easy'
      )
      RETURNING id
    `)

    const taskId = (taskResult.rows[0] as any)?.id

    // Send wake event to notify Kevin to spawn Phil
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN

    if (gatewayToken) {
      await fetch(`${gatewayUrl}/api/cron/wake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${gatewayToken}`
        },
        body: JSON.stringify({
          text: `New task #${taskId} created: Analyze X folder "${x_folder}" (${bookmarkCount} bookmarks). Please spawn Phil to handle this.`,
          mode: "now"
        })
      }).catch(err => console.error("Wake failed:", err))
    }

    return NextResponse.json({ 
      success: true,
      taskId,
      bookmarkCount,
      message: `Analysis task #${taskId} created for ${bookmarkCount} bookmarks. Phil will process this shortly.`
    })

  } catch (error: any) {
    console.error("[analyze-folder] Error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to create analysis task" 
    }, { status: 500 })
  }
}
