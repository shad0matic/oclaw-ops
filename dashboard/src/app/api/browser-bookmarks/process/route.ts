import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/browser-bookmarks/process
 * Master orchestrator: Runs all bookmark processing phases in sequence
 * Can be called periodically via cron or triggered manually
 * 
 * Pipeline:
 * 1. Validate URLs (detect 404s)
 * 2. Scrape content from alive URLs
 * 3. Summarize scraped content
 * 4. Prepare for categorization
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validateBatch = parseInt(searchParams.get("validateBatch") || "20", 10);
    const scrapeBatch = parseInt(searchParams.get("scrapeBatch") || "5", 10);
    const summarizeBatch = parseInt(searchParams.get("summarizeBatch") || "10", 10);
    const categorizeBatch = parseInt(searchParams.get("categorizeBatch") || "5", 10);

    const results = {
      validation: null as any,
      scraping: null as any,
      summarization: null as any,
      categorization: null as any,
    };

    // Phase 1: Validate URLs
    try {
      const validationResponse = await fetch(
        `${request.nextUrl.origin}/api/browser-bookmarks/validate?batch=${validateBatch}`,
        { method: "POST" }
      );
      results.validation = await validationResponse.json();
    } catch (error) {
      console.error("Validation phase failed:", error);
      results.validation = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Phase 2: Scrape content
    try {
      const scrapingResponse = await fetch(
        `${request.nextUrl.origin}/api/browser-bookmarks/scrape?batch=${scrapeBatch}`,
        { method: "POST" }
      );
      results.scraping = await scrapingResponse.json();
    } catch (error) {
      console.error("Scraping phase failed:", error);
      results.scraping = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Phase 3: Summarize content
    try {
      const summarizationResponse = await fetch(
        `${request.nextUrl.origin}/api/browser-bookmarks/summarize?batch=${summarizeBatch}`,
        { method: "POST" }
      );
      results.summarization = await summarizationResponse.json();
    } catch (error) {
      console.error("Summarization phase failed:", error);
      results.summarization = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Phase 4: Prepare for categorization
    try {
      const categorizationResponse = await fetch(
        `${request.nextUrl.origin}/api/browser-bookmarks/categorize?batch=${categorizeBatch}`,
        { method: "POST" }
      );
      results.categorization = await categorizationResponse.json();
    } catch (error) {
      console.error("Categorization phase failed:", error);
      results.categorization = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Calculate totals
    const totals = {
      validated: results.validation?.processed || 0,
      scraped: results.scraping?.processed || 0,
      summarized: results.summarization?.processed || 0,
      readyForCategorization: results.categorization?.processed || 0,
    };

    return NextResponse.json({
      success: true,
      totals,
      details: results,
      message: "Bookmark processing pipeline completed",
    });
  } catch (error) {
    console.error("Error running bookmark processing pipeline:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run processing pipeline",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser-bookmarks/process
 * Get processing pipeline status and queue stats
 */
export async function GET(request: NextRequest) {
  try {
    const statsResponse = await fetch(
      `${request.nextUrl.origin}/api/browser-bookmarks?limit=1`
    );
    const statsData = await statsResponse.json();

    return NextResponse.json({
      success: true,
      stats: statsData.stats,
      message: "Use POST to run the processing pipeline",
    });
  } catch (error) {
    console.error("Error fetching pipeline status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch status",
      },
      { status: 500 }
    );
  }
}
