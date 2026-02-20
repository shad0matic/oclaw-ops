import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface Bookmark {
  id: string;
  text: string;
  author_handle: string;
  author_name: string;
  summary: string | null;
  tags: any;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  emoji: string;
}

interface Suggestion {
  bookmark_id: string;
  suggested_category_id: number | null;
  suggested_category_name: string | null;
  suggested_category_slug: string | null;
  confidence: number;
  reasoning: string;
}

// POST /api/x-bookmarks/auto-categorize
// Analyze bookmarks and suggest categories using Gemini
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookmark_ids, limit = 20, model = "gemini-2.0-flash-exp" } = body;

    // Fetch uncategorized bookmarks
    let query: string;
    let params: any[];

    if (bookmark_ids && bookmark_ids.length > 0) {
      query = `
        SELECT id, text, author_handle, author_name, summary, tags
        FROM ops.x_bookmarks
        WHERE id = ANY($1)
        LIMIT $2
      `;
      params = [bookmark_ids, limit];
    } else {
      query = `
        SELECT id, text, author_handle, author_name, summary, tags
        FROM ops.x_bookmarks
        WHERE category IS NULL OR category = ''
        ORDER BY created_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const { rows: bookmarks } = await pool.query<Bookmark>(query, params);

    if (bookmarks.length === 0) {
      return NextResponse.json({
        suggestions: [],
        cost_usd: 0,
        message: "No uncategorized bookmarks found",
      });
    }

    // Fetch available categories
    const { rows: categories } = await pool.query<Category>(`
      SELECT id, name, slug, emoji
      FROM ops.x_bookmark_categories
      ORDER BY sort_order, name
    `);

    // Build AI prompt
    const categoriesText = categories
      .map((c) => `- ${c.emoji} ${c.name} (slug: ${c.slug})`)
      .join("\n");

    const bookmarksText = bookmarks
      .map((b, i) => {
        const tags = Array.isArray(b.tags) ? b.tags.join(", ") : "";
        return `
[${i + 1}] ID: ${b.id}
Author: @${b.author_handle || "unknown"} (${b.author_name || ""})
Text: ${b.text || "(no text)"}
${b.summary ? `Summary: ${b.summary}` : ""}
${tags ? `Tags: ${tags}` : ""}
`.trim();
      })
      .join("\n\n");

    const prompt = `You are categorizing X/Twitter bookmarks into folders.

Available categories:
${categoriesText}

For each bookmark, respond with a JSON object in this exact format:
{
  "bookmark_id": "...",
  "category_slug": "category-slug or null if unsure",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation (max 100 chars)"
}

IMPORTANT:
- Return ONLY a JSON array of objects, one per bookmark
- Use the exact category slug from the list above
- Use null for category_slug if confidence is below 0.5 or if unclear
- Keep reasoning concise (max 100 characters)
- Do not include any markdown formatting, just raw JSON

Bookmarks to categorize:
${bookmarksText}`;

    // Call Gemini API
    const geminiModel = genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();

    // Parse AI response
    let aiResults: any[];
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      aiResults = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: responseText },
        { status: 500 }
      );
    }

    // Map results to suggestions
    const suggestions: Suggestion[] = aiResults.map((result: any) => {
      const category = categories.find(
        (c) => c.slug === result.category_slug
      );
      return {
        bookmark_id: result.bookmark_id,
        suggested_category_id: category?.id || null,
        suggested_category_name: category?.name || null,
        suggested_category_slug: result.category_slug,
        confidence: parseFloat(result.confidence) || 0,
        reasoning: result.reasoning || "No reasoning provided",
      };
    });

    // Calculate cost (approximate for Gemini 2.0 Flash)
    // Gemini 2.0 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
    const inputTokens = Math.ceil(prompt.length / 4); // Rough estimate: 4 chars per token
    const outputTokens = Math.ceil(responseText.length / 4);
    const costUsd =
      (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.3;

    return NextResponse.json({
      suggestions,
      cost_usd: parseFloat(costUsd.toFixed(6)),
      model_used: model,
      bookmarks_analyzed: bookmarks.length,
    });
  } catch (error: any) {
    console.error("Auto-categorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-categorize bookmarks" },
      { status: 500 }
    );
  }
}
