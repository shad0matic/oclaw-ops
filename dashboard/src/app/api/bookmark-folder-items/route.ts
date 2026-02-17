
import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { bookmarkFolderItems } from '~/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');
  if (!folderId) {
    return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
  }
  const items = await db.select().from(bookmarkFolderItems).where(eq(bookmarkFolderItems.folderId, BigInt(folderId)));
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { folderId, bookmarkId } = await request.json();
  const newItem = await db.insert(bookmarkFolderItems).values({ folderId, bookmarkId }).returning();
  return NextResponse.json(newItem[0]);
}

export async function DELETE(request: Request) {
    const { folderId, bookmarkId } = await request.json();
    await db.delete(bookmarkFolderItems).where(and(eq(bookmarkFolderItems.folderId, folderId), eq(bookmarkFolderItems.bookmarkId, bookmarkId)));
    return new Response(null, { status: 204 });
}
