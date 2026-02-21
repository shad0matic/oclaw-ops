import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { chromium } from "playwright";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/**
 * POST /api/browser-bookmarks/scrape
 * Scraper + L1 Summarizer: Scrapes content from alive URLs and generates summaries
 * Processes bookmarks with status='alive' and scraped_at IS NULL
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batch") || "5", 10);
    const timeoutMs = parseInt(searchParams.get("timeout") || "10000", 10);

    // Fetch alive bookmarks that haven't been scraped
    const { rows: bookmarksToScrape } = await pool.query(
      `SELECT id, url, title FROM ops.browser_bookmarks 
       WHERE status = 'alive' AND scraped_at IS NULL 
       ORDER BY checked_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    if (bookmarksToScrape.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookmarks to scrape",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      scraped: 0,
      failed: 0,
    };

    // Launch browser once for all scrapes
    const browser = await chromium.launch({ headless: true });

    try {
      for (const bookmark of bookmarksToScrape) {
        try {
          const page = await browser.newPage();
          
          // Set timeout and navigate
          page.setDefaultTimeout(timeoutMs);
          await page.goto(bookmark.url, { waitUntil: "domcontentloaded" });

          // Extract full HTML
          const html = await page.content();
          
          // Extract metadata
          const title = await page.title().catch(() => bookmark.title || null);
          const faviconUrl = await page
            .locator('link[rel="icon"], link[rel="shortcut icon"]')
            .first()
            .getAttribute("href")
            .catch(() => null);
          
          const ogImage = await page
            .locator('meta[property="og:image"]')
            .first()
            .getAttribute("content")
            .catch(() => null);
          
          const ogDescription = await page
            .locator('meta[property="og:description"], meta[name="description"]')
            .first()
            .getAttribute("content")
            .catch(() => null);

          await page.close();

          // Use Readability to extract main content
          const dom = new JSDOM(html, { url: bookmark.url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          const content = article?.textContent || "";
          const contentType = article ? "article" : "html";

          // Store scraped data
          await pool.query(
            `UPDATE ops.browser_bookmarks 
             SET scraped_at = NOW(), 
                 content = $1, 
                 content_type = $2,
                 title = COALESCE($3, title),
                 favicon_url = $4,
                 og_image = $5,
                 og_description = $6
             WHERE id = $7`,
            [content, contentType, title, faviconUrl, ogImage, ogDescription, bookmark.id]
          );

          results.scraped++;
          results.processed++;
        } catch (error) {
          console.error(`Failed to scrape ${bookmark.url}:`, error);
          
          // Mark as failed but don't block the batch
          await pool.query(
            `UPDATE ops.browser_bookmarks 
             SET scraped_at = NOW(), 
                 content_type = 'error'
             WHERE id = $1`,
            [bookmark.id]
          );

          results.failed++;
          results.processed++;
        }
      }
    } finally {
      await browser.close();
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error scraping bookmarks:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to scrape bookmarks",
      },
      { status: 500 }
    );
  }
}
