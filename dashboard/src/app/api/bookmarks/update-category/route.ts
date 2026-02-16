import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

// POST /api/bookmarks/update-category - Update category for a bookmark

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookmarkId, category } = body;

    if (!bookmarkId || !category) {
      return NextResponse.json(
        { error: "Bookmark ID and category are required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE ops.x_bookmarks SET category = $1 WHERE id = $2 RETURNING *`,
      [category, bookmarkId]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bookmark: result[0] });
  } catch (error) {
    console.error("Error updating bookmark category:", error);
    return NextResponse.json(
      { error: "Failed to update bookmark category" },
      { status: 500 }
    );
  }
}
