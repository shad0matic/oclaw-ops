import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/x-folders - Fetch X bookmark folders with counts and mappings
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        x_folder,
        COUNT(*) as bookmark_count,
        m.id as mapping_id,
        m.category_id,
        m.analysis_prompt,
        m.description,
        c.name as category_name,
        c.emoji as category_emoji
      FROM ops.x_bookmarks b
      LEFT JOIN ops.x_folder_mappings m ON b.x_folder = m.x_folder
      LEFT JOIN ops.x_bookmark_categories c ON m.category_id = c.id
      WHERE b.x_folder IS NOT NULL AND b.x_folder != ''
      GROUP BY b.x_folder, m.id, m.category_id, m.analysis_prompt, m.description, c.name, c.emoji
      ORDER BY COUNT(*) DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching X folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch X folders" },
      { status: 500 }
    );
  }
}

// POST /api/x-folders - Create/update folder mapping
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { x_folder, category_id, analysis_prompt, description } = body;

    if (!x_folder) {
      return NextResponse.json({ error: "x_folder is required" }, { status: 400 });
    }

    const { rows } = await pool.query(`
      INSERT INTO ops.x_folder_mappings (x_folder, category_id, analysis_prompt, description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (x_folder) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        analysis_prompt = EXCLUDED.analysis_prompt,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING *
    `, [x_folder, category_id || null, analysis_prompt || null, description || null]);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error saving folder mapping:", error);
    return NextResponse.json(
      { error: "Failed to save folder mapping" },
      { status: 500 }
    );
  }
}
