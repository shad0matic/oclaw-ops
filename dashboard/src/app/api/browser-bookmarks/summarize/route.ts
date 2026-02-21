import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini (L1 model - Flash)
const L1_MODEL = "gemini-2.0-flash-exp"; // L1 = cheap, fast model

function isValidGeminiKey(key: string | undefined): boolean {
  if (!key || key === "" || key === "placeholder") return false;
  // Real Gemini keys start with "AIza" and are 39 chars long
  return key.startsWith("AIza") && key.length === 39;
}

/**
 * POST /api/browser-bookmarks/summarize
 * L1 Summarizer: Generates concise summaries of scraped content
 * Processes bookmarks with content but no summary
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batch") || "10", 10);

    // Check if we have a valid API key - if not, create basic summaries from og_description
    const apiKey = process.env.GEMINI_API_KEY;
    const useAI = isValidGeminiKey(apiKey);
    const genAI = useAI ? new GoogleGenerativeAI(apiKey!) : null;
    
    if (!useAI) {
      console.warn(`GEMINI_API_KEY not configured or invalid (key: ${apiKey ? apiKey.substring(0, 10) + "..." : "none"}). Using fallback: og_description or content preview`);
    } else {
      console.log("Using Gemini AI for summarization");
    }

    // Fetch scraped bookmarks without summaries
    const { rows: bookmarksToSummarize } = await pool.query(
      `SELECT id, url, title, content, og_description FROM ops.browser_bookmarks 
       WHERE content IS NOT NULL 
         AND content != '' 
         AND content_type != 'error'
         AND summary IS NULL 
       ORDER BY scraped_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    if (bookmarksToSummarize.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookmarks to summarize",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      summarized: 0,
      failed: 0,
    };

    const model = useAI ? genAI!.getGenerativeModel({ model: L1_MODEL }) : null;

    for (const bookmark of bookmarksToSummarize) {
      try {
        let summary = "";
        let summaryModel = "fallback";
        
        if (useAI && model) {
          // AI-powered summarization
          const truncatedContent = bookmark.content.slice(0, 4000);

          const prompt = `You are a content summarizer. Create a concise, informative summary of this webpage content.

Title: ${bookmark.title || "Untitled"}
URL: ${bookmark.url}
${bookmark.og_description ? `Meta Description: ${bookmark.og_description}` : ""}

Content:
${truncatedContent}

Provide:
1. A 2-3 sentence summary of the main topic/purpose
2. 3-5 key points or takeaways (as bullet points)
3. 2-4 relevant tags/categories (comma-separated)

Format:
**Summary:** [your summary]

**Key Points:**
- [point 1]
- [point 2]
- [point 3]

**Tags:** [tag1, tag2, tag3]`;

          const result = await model.generateContent(prompt);
          summary = result.response.text();
          summaryModel = L1_MODEL;
        } else {
          // Fallback: use og_description or content preview
          if (bookmark.og_description && bookmark.og_description.length > 20) {
            summary = `**Summary:** ${bookmark.og_description}\n\n**Note:** AI summarization not available (GEMINI_API_KEY not configured)`;
          } else {
            const preview = bookmark.content.slice(0, 300).trim();
            summary = `**Preview:** ${preview}...\n\n**Note:** AI summarization not available (GEMINI_API_KEY not configured)`;
          }
          summaryModel = "fallback-preview";
        }

        // Extract tags from the summary
        const tagsMatch = summary.match(/\*\*Tags:\*\*\s*(.+?)(?:\n|$)/i);
        let tags: string[] = [];
        if (tagsMatch) {
          tags = tagsMatch[1]
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
        }

        // Store summary
        await pool.query(
          `UPDATE ops.browser_bookmarks 
           SET summary = $1, 
               summarized_at = NOW(),
               summary_model = $2,
               tags = $3
           WHERE id = $4`,
          [summary, summaryModel, tags.length > 0 ? tags : null, bookmark.id]
        );

        results.summarized++;
        results.processed++;

        // Small delay to avoid rate limiting (only for AI calls)
        if (useAI) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to summarize bookmark ${bookmark.id}:`, error);
        results.failed++;
        results.processed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error summarizing bookmarks:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to summarize bookmarks",
      },
      { status: 500 }
    );
  }
}
