import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbProcessingQueue, xBookmarks } from '@/lib/schema';
import { z } from 'zod';
import { inArray, isNull, sql } from 'drizzle-orm';

const batchSchema = z.object({
  folderId: z.string().optional(),
  allUnprocessed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = batchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { folderId, allUnprocessed } = parsed.data;

  try {
    let bookmarkIds: string[] = [];

    if (folderId) {
      // This is a placeholder. The actual query will depend on how folders are structured.
      // Assuming a `bookmark_folder_items` table exists.
      const bookmarksInFolder = await db.select({ id: xBookmarks.id }).from(xBookmarks)
      // .where(eq(xBookmarks.folderId, folderId)); // Simplified for now
      bookmarkIds = bookmarksInFolder.map(b => b.id);
    } else if (allUnprocessed) {
        // This is a placeholder as well.
        const unprocessedBookmarks = await db.select({ id: xBookmarks.id }).from(xBookmarks)
        // .where(isNull(xBookmarks.processedAt)); // Simplified
        bookmarkIds = unprocessedBookmarks.map(b => b.id);
    } else {
        return NextResponse.json({ error: 'Either folderId or allUnprocessed must be provided' }, { status: 400 });
    }

    if (bookmarkIds.length === 0) {
        return NextResponse.json({ success: true, message: 'No bookmarks to add' });
    }

    const values = bookmarkIds.map(id => ({ bookmarkId: id }));
    await db.insert(kbProcessingQueue).values(values).onConflictDoNothing();
    
    return NextResponse.json({ success: true, count: values.length });
  } catch (error) {
    console.error('Error batch adding to knowledge base processing queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
