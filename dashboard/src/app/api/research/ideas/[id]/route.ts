export const dynamic = "force-dynamic"
import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const updatedIdeaResult = await pool.query(
    `UPDATE ops.research_ideas SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  const updatedIdea = updatedIdeaResult.rows[0]

  return NextResponse.json(updatedIdea);
}
