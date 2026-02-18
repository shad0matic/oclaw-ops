import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbProcessingQueue } from '@/lib/schema';
import { inArray } from 'drizzle-orm';

export async function POST() {
  try {
    await db.delete(kbProcessingQueue).where(inArray(kbProcessingQueue.status, ['done', 'failed']));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing knowledge base processing queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
