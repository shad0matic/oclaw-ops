import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET all mappings or single mapping by x_folder
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const xFolder = searchParams.get("x_folder");

    if (xFolder) {
      // Get single mapping
      const result = await pool.query(
        `SELECT m.*, c.name as category_name, c.slug as category_slug
         FROM ops.x_folder_mappings m
         LEFT JOIN ops.x_bookmark_categories c ON m.category_id = c.id
         WHERE m.x_folder = $1`,
        [xFolder]
      );
      return NextResponse.json(result.rows[0] || null);
    }

    // Get all mappings
    const result = await pool.query(
      `SELECT m.*, c.name as category_name, c.slug as category_slug
       FROM ops.x_folder_mappings m
       LEFT JOIN ops.x_bookmark_categories c ON m.category_id = c.id
       ORDER BY m.x_folder`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching folder mappings:", error);
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

// POST create or update mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x_folder, project, analysis_prompt, description } = body;

    if (!x_folder) {
      return NextResponse.json({ error: "x_folder is required" }, { status: 400 });
    }

    // Upsert mapping - store project in description field for now
    // (category_id links to bookmark categories, but we want project mapping)
    const result = await pool.query(
      `INSERT INTO ops.x_folder_mappings (x_folder, description, analysis_prompt, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (x_folder) 
       DO UPDATE SET description = $2, analysis_prompt = $3, updated_at = NOW()
       RETURNING *`,
      [x_folder, project || null, analysis_prompt || null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error saving folder mapping:", error);
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
}

// DELETE mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const xFolder = searchParams.get("x_folder");

    if (!xFolder) {
      return NextResponse.json({ error: "x_folder is required" }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM ops.x_folder_mappings WHERE x_folder = $1`,
      [xFolder]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder mapping:", error);
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  }
}
