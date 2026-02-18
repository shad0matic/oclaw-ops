import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbProcessingQueue } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db
      .select({
        status: kbProcessingQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(kbProcessingQueue)
      .groupBy(kbProcessingQueue.status);

    const stats = {
      pending: 0,
      processing: 0,
      done: 0,
      failed: 0,
    };

    result.forEach(row => {
      if (row.status && row.status in stats) {
        stats[row.status as keyof typeof stats] = row.count;
      }
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting knowledge base processing queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
