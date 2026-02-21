import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/browser-bookmarks/categorize
 * Interactive Categorization: Sends summarized bookmarks to user via Telegram for folder assignment
 * Processes bookmarks with summary but no kb_folder_id and boss_categorized=false
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batch") || "5", 10);
    const userId = searchParams.get("userId") || "stuart"; // Default to stuart

    // Fetch summarized bookmarks without KB folder assignment
    const { rows: bookmarksToCategorizе } = await pool.query(
      `SELECT id, url, title, summary, tags FROM ops.browser_bookmarks 
       WHERE summary IS NOT NULL 
         AND kb_folder_id IS NULL 
         AND boss_categorized = false 
       ORDER BY summarized_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    if (bookmarksToCategorizе.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookmarks to categorize",
        processed: 0,
      });
    }

    // Fetch available folders
    const { rows: folders } = await pool.query(
      `SELECT id, name, description, parent_id 
       FROM ops.bookmark_folders 
       ORDER BY name ASC`
    );

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      bookmarks: [] as any[],
    };

    // For now, we'll mark them as sent and return the data
    // The actual Telegram integration will be handled by the main agent
    for (const bookmark of bookmarksToCategorizе) {
      try {
        // Mark as sent for categorization
        await pool.query(
          `UPDATE ops.browser_bookmarks 
           SET boss_categorized = true 
           WHERE id = $1`,
          [bookmark.id]
        );

        results.sent++;
        results.processed++;
        results.bookmarks.push({
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          summary: bookmark.summary,
          tags: bookmark.tags,
        });
      } catch (error) {
        console.error(`Failed to mark bookmark ${bookmark.id} for categorization:`, error);
        results.failed++;
        results.processed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      folders,
      userId,
      message: "Bookmarks ready for categorization. Use the returned data to send interactive prompts.",
    });
  } catch (error) {
    console.error("Error preparing bookmarks for categorization:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to categorize bookmarks",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/browser-bookmarks/categorize
 * Assign a bookmark to a folder based on user selection
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookmarkId, folderId, createFolder } = body;

    let targetFolderId = folderId;

    // Create new folder if requested
    if (createFolder) {
      const { name, description, parentId } = createFolder;
      const { rows } = await pool.query(
        `INSERT INTO ops.bookmark_folders (name, description, parent_id) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        [name, description || null, parentId || null]
      );
      targetFolderId = rows[0].id;
    }

    // Assign bookmark to folder
    await pool.query(
      `UPDATE ops.browser_bookmarks 
       SET kb_folder_id = $1 
       WHERE id = $2`,
      [targetFolderId, bookmarkId]
    );

    return NextResponse.json({
      success: true,
      bookmarkId,
      folderId: targetFolderId,
    });
  } catch (error) {
    console.error("Error assigning bookmark to folder:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to assign bookmark",
      },
      { status: 500 }
    );
  }
}
