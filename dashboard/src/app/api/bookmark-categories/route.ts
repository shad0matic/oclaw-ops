import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";

// GET /api/bookmark-categories - Fetch hierarchical categories with counts

export async function GET() {
  try {
    // Fetch all categories
    const { rows: categories } = await pool.query(`
      SELECT c.*, COUNT(b.id) as bookmark_count
      FROM ops.x_bookmark_categories c
      LEFT JOIN ops.x_bookmarks b ON c.slug = b.category
      GROUP BY c.id
      ORDER BY c.sort_order, c.name;
    `);

    // Build a tree structure with counts including child categories
    const categoryMap = new Map<number, any>();
    const rootCategories = [];

    // Initialize category map with counts
    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, children: [], total_count: cat.bookmark_count });
    }

    // Build hierarchy and aggregate counts
    for (const cat of categories) {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id));
          // Add to parent's total count recursively
          let currentParent = parent;
          while (currentParent) {
            currentParent.total_count += cat.bookmark_count;
            currentParent = cat.parent_id ? categoryMap.get(currentParent.parent_id) : null;
          }
        }
      } else {
        rootCategories.push(categoryMap.get(cat.id));
      }
    }

    return NextResponse.json(rootCategories);
  } catch (error) {
    console.error("Error fetching bookmark categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmark categories" },
      { status: 500 }
    );
  }
}
