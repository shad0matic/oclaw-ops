
import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { bookmarkFolders } from '~/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const folders = await db.select().from(bookmarkFolders);
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const { name, description, parent_id } = await request.json();
  const newFolder = await db.insert(bookmarkFolders).values({ name, description, parent_id }).returning();
  return NextResponse.json(newFolder[0]);
}

export async function PUT(request: Request) {
    const { id, name, description, parent_id } = await request.json();
    const updatedFolder = await db.update(bookmarkFolders).set({ name, description, parent_id }).where(eq(bookmarkFolders.id, id)).returning();
    return NextResponse.json(updatedFolder[0]);
}

export async function DELETE(request: Request) {
    const { id } = await request.json();
    await db.delete(bookmarkFolders).where(eq(bookmarkFolders.id, id));
    return new Response(null, { status: 204 });
}
