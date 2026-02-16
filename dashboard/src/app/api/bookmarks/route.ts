import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// GET /api/bookmarks - Fetch bookmarks with pagination, filtering, and search

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = (page - 1) * limit;
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    // Build query conditions
    let query = `
      SELECT *
      FROM ops.x_bookmarks
    `;
    let conditions = [];
    let params: any[] = [];

    // Filter by category if provided
    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    // Full-text search if provided
    if (search) {
      conditions.push(`text ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }

    // Append conditions to query
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Get total count for pagination
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*)");
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult[0].count, 10);

    // Add pagination and ordering
    query += `
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    // Fetch paginated bookmarks
    const bookmarks = await db.query(query, params);

    return NextResponse.json({
      bookmarks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}
