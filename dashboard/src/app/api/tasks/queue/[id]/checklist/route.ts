import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/tasks/queue/[id]/checklist - Get checklist items for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT id, task_id, step_order, title, description, status, 
              completed_at, completed_by, notes, metadata, created_at, updated_at
       FROM ops.task_checklist 
       WHERE task_id = $1 
       ORDER BY step_order ASC`,
      [taskId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/queue/[id]/checklist - Add a checklist item
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const body = await request.json();

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { title, description, step_order } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get next step_order if not provided
    let order = step_order;
    if (order === undefined) {
      const { rows: maxRows } = await pool.query(
        `SELECT COALESCE(MAX(step_order), 0) + 1 as next_order 
         FROM ops.task_checklist WHERE task_id = $1`,
        [taskId]
      );
      order = maxRows[0].next_order;
    }

    const { rows } = await pool.query(
      `INSERT INTO ops.task_checklist (task_id, step_order, title, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [taskId, order, title, description || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/queue/[id]/checklist - Update a checklist item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { itemId, status, notes, completed_by } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      if (status === 'done') {
        updates.push(`completed_at = NOW()`);
        if (completed_by) {
          updates.push(`completed_by = $${paramIndex++}`);
          values.push(completed_by);
        }
      }
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    values.push(itemId);

    const { rows } = await pool.query(
      `UPDATE ops.task_checklist 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/queue/[id]/checklist - Delete a checklist item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM ops.task_checklist WHERE id = $1`,
      [itemId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}
