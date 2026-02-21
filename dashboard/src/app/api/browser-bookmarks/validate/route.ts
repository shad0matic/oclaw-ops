import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/browser-bookmarks/validate
 * Background validator: Checks URLs for accessibility (detect 404s, redirects)
 * Processes bookmarks with status='pending' in batches
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batch") || "10", 10);
    const timeoutMs = parseInt(searchParams.get("timeout") || "5000", 10);

    // Fetch pending bookmarks
    const { rows: pendingBookmarks } = await pool.query(
      `SELECT id, url FROM ops.browser_bookmarks 
       WHERE status = 'pending' 
       ORDER BY imported_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    if (pendingBookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending bookmarks to validate",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      alive: 0,
      dead: 0,
      redirect: 0,
      error: 0,
    };

    // Validate each URL
    for (const bookmark of pendingBookmarks) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(bookmark.url, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BookmarkValidator/1.0)",
          },
        });

        clearTimeout(timeoutId);

        let status = "error";
        let httpCode = response.status;

        // Classify response
        if (response.status >= 200 && response.status < 300) {
          status = "alive";
          results.alive++;
        } else if (response.status >= 300 && response.status < 400) {
          status = "redirect";
          results.redirect++;
        } else if (response.status === 404 || response.status >= 400) {
          status = "dead";
          results.dead++;
        }

        // Update bookmark
        await pool.query(
          `UPDATE ops.browser_bookmarks 
           SET status = $1, http_code = $2, checked_at = NOW() 
           WHERE id = $3`,
          [status, httpCode, bookmark.id]
        );

        results.processed++;
      } catch (error) {
        // Network error or timeout
        await pool.query(
          `UPDATE ops.browser_bookmarks 
           SET status = 'error', checked_at = NOW() 
           WHERE id = $1`,
          [bookmark.id]
        );

        results.error++;
        results.processed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error validating bookmarks:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to validate bookmarks",
      },
      { status: 500 }
    );
  }
}
