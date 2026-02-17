
import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { xBookmarks } from '~/lib/schema';
import { inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (ids) {
    const idArray = ids.split(',');
    const bookmarks = await db.select().from(xBookmarks).where(inArray(xBookmarks.id, idArray));
    return NextResponse.json(bookmarks);
  }

  const bookmarks = await db.select().from(xBookmarks);
  return NextResponse.json(bookmarks);
}
