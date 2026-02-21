import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { chromium } from "playwright";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/**
 * POST /api/browser-bookmarks/scrape
 * Scraper + L1 Summarizer: Scrapes content from alive URLs and generates summaries
 * Processes ALL bookmarks with status='alive' and scraped_at IS NULL
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeoutMs = parseInt(searchParams.get("timeout") || "10000", 10);

    // Get total count of bookmarks to scrape
    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*) as total FROM ops.browser_bookmarks 
       WHERE status = 'alive' AND scraped_at IS NULL`
    );

    const totalToScrape = parseInt(total, 10);

    if (totalToScrape === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookmarks to scrape",
        processed: 0,
        remaining: 0,
      });
    }

    const results = {
      processed: 0,
      scraped: 0,
      failed: 0,
      totalToScrape,
    };

    // Track last access time per domain for rate limiting
    const domainLastAccess = new Map<string, number>();
    const MIN_DOMAIN_DELAY_MS = 5000; // 5 seconds between requests to same domain

    // Launch browser once for all scrapes
    const browser = await chromium.launch({ headless: true });

    try {
      // Process ALL alive/unscraped bookmarks
      const batchSize = 20; // Internal batch size for fetching
      let hasMore = true;

      while (hasMore) {
        // Fetch next batch of bookmarks to scrape
        const { rows: bookmarksToScrape } = await pool.query(
          `SELECT id, url, title FROM ops.browser_bookmarks 
           WHERE status = 'alive' AND scraped_at IS NULL 
           ORDER BY checked_at ASC 
           LIMIT $1`,
          [batchSize]
        );

        if (bookmarksToScrape.length === 0) {
          hasMore = false;
          break;
        }

        for (const bookmark of bookmarksToScrape) {
          // Extract domain for rate limiting
          let domain = "";
          try {
            const urlObj = new URL(bookmark.url);
            domain = urlObj.hostname;
          } catch {
            domain = bookmark.url;
          }

          // Rate limit: wait if we accessed this domain recently
          const lastAccess = domainLastAccess.get(domain);
          if (lastAccess) {
            const timeSinceLastAccess = Date.now() - lastAccess;
            if (timeSinceLastAccess < MIN_DOMAIN_DELAY_MS) {
              const waitTime = MIN_DOMAIN_DELAY_MS - timeSinceLastAccess;
              console.log(`Rate limiting: waiting ${waitTime}ms before scraping ${domain}`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }

          // Update last access time for this domain
          domainLastAccess.set(domain, Date.now());

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

        // Log progress
        console.log(`Scraped ${results.processed}/${totalToScrape} bookmarks (${results.scraped} successful, ${results.failed} failed)...`);
      }
    } finally {
      await browser.close();
    }

    const remaining = Math.max(0, totalToScrape - results.processed);

    return NextResponse.json({
      success: true,
      ...results,
      remaining,
      message: remaining > 0 
        ? `Processed ${results.processed} bookmarks. ${remaining} still need scraping.`
        : `All ${results.processed} bookmarks scraped! (${results.scraped} successful, ${results.failed} failed)`,
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
