import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET all bookmark folders (with hierarchy)
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, name, description, parent_id, created_at, updated_at
      FROM ops.bookmark_folders
      ORDER BY name
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookmark folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// POST create a new folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, parent_id } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO ops.bookmark_folders (name, description, parent_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, parent_id, created_at, updated_at
    `, [name.trim(), description || null, parent_id || null]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating bookmark folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// PUT update a folder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, parent_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Prevent folder from being its own parent
    if (parent_id === id) {
      return NextResponse.json({ error: 'Folder cannot be its own parent' }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE ops.bookmark_folders
      SET name = $1, description = $2, parent_id = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, description, parent_id, created_at, updated_at
    `, [name.trim(), description || null, parent_id || null, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bookmark folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// DELETE a folder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const result = await pool.query(`
      DELETE FROM ops.bookmark_folders WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Error deleting bookmark folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
