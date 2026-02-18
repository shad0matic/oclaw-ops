import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbProcessingQueue } from '@/lib/schema';
import { z } from 'zod';

const addSchema = z.object({
  bookmarkId: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = addSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { bookmarkId } = parsed.data;

  try {
    await db.insert(kbProcessingQueue).values({ bookmarkId }).onConflictDoNothing();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to knowledge base processing queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
