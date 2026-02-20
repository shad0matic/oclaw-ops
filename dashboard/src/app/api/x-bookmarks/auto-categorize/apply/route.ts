import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Assignment {
  bookmark_id: string;
  category_slug: string;
}

// POST /api/x-bookmarks/auto-categorize/apply
// Apply approved AI suggestions to bookmarks
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { assignments } = body as { assignments: Assignment[] };

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "No assignments provided" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Update each bookmark with its assigned category
    let updatedCount = 0;
    for (const assignment of assignments) {
      const result = await client.query(
        `UPDATE ops.x_bookmarks 
         SET category = $1
         WHERE id = $2`,
        [assignment.category_slug, assignment.bookmark_id]
      );
      updatedCount += result.rowCount || 0;
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      message: `Successfully categorized ${updatedCount} bookmark(s)`,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Failed to apply categorization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply categorization" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
