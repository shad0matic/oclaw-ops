export const dynamic = "force-dynamic"
import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let whereClause = '';
  if (status) {
    whereClause = `WHERE status = '${status}'`;
  }

  const ideas = await prisma.$queryRawUnsafe(
    `SELECT * FROM ops.research_ideas ${whereClause} ORDER BY created_at DESC`
  );

  return NextResponse.json(ideas);
}
