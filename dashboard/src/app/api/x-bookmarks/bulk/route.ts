import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// PATCH /api/x-bookmarks/bulk - Bulk update bookmarks
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ids, action, category_id, fields } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty bookmark IDs" },
        { status: 400 }
      );
    }

    if (action === "move") {
      // Bulk move to category
      if (!category_id) {
        return NextResponse.json(
          { error: "category_id is required for move action" },
          { status: 400 }
        );
      }

      const query = `
        UPDATE ops.x_bookmarks
        SET category = $1, updated_at = NOW()
        WHERE id = ANY($2::text[])
      `;
      
      await pool.query(query, [category_id, ids]);

      return NextResponse.json({
        success: true,
        message: `Moved ${ids.length} bookmark(s) to category ${category_id}`,
      });
    } else if (action === "update") {
      // Bulk update fields
      if (!fields || typeof fields !== "object") {
        return NextResponse.json(
          { error: "fields object is required for update action" },
          { status: 400 }
        );
      }

      const updates = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (fields.processed !== undefined) {
        updates.push(`processed = $${paramIndex}`);
        params.push(fields.processed);
        paramIndex++;
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 }
        );
      }

      updates.push(`updated_at = NOW()`);

      const query = `
        UPDATE ops.x_bookmarks
        SET ${updates.join(", ")}
        WHERE id = ANY($${paramIndex}::text[])
      `;
      params.push(ids);

      await pool.query(query, params);

      return NextResponse.json({
        success: true,
        message: `Updated ${ids.length} bookmark(s)`,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'move' or 'update'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in bulk update:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk update" },
      { status: 500 }
    );
  }
}

// DELETE /api/x-bookmarks/bulk - Bulk delete bookmarks
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty bookmark IDs" },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM ops.x_bookmarks
      WHERE id = ANY($1::text[])
    `;

    const result = await pool.query(query, [ids]);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.rowCount} bookmark(s)`,
      deleted: result.rowCount,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk delete" },
      { status: 500 }
    );
  }
}
