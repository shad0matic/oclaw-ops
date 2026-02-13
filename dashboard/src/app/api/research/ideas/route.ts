export const dynamic = "force-dynamic"
import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = `SELECT * FROM ops.research_ideas`;
  const values = [];

  if (status) {
    query += ` WHERE status = $1`;
    values.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const ideasResult = await pool.query(query, values);
  const ideas = ideasResult.rows.map(idea => ({
    ...idea,
    id: idea.id.toString()
  }))

  return NextResponse.json(ideas);
}
