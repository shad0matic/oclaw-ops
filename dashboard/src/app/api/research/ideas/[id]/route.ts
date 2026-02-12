import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const updatedIdea = await prisma.$executeRawUnsafe(
    `UPDATE ops.research_ideas SET status = '${status}', updated_at = NOW() WHERE id = ${id}`
  );

  return NextResponse.json(updatedIdea);
}
