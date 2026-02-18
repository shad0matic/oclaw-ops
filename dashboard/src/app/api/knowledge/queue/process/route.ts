import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kbProcessingQueue, xBookmarks } from '@/lib/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { extractText } from '@/lib/text-extraction';

export async function POST(req: NextRequest) {
    try {
        const itemsToProcess = await db.select().from(kbProcessingQueue).where(eq(kbProcessingQueue.status, 'pending')).orderBy(kbProcessingQueue.priority, kbProcessingQueue.createdAt).limit(10);

        if (itemsToProcess.length === 0) {
            return NextResponse.json({ message: 'No items to process' });
        }

        for (const item of itemsToProcess) {
            await db.update(kbProcessingQueue).set({ status: 'processing', startedAt: new Date() }).where(eq(kbProcessingQueue.id, item.id));

            try {
                const bookmark = await db.select().from(xBookmarks).where(eq(xBookmarks.id, item.bookmarkId)).then(res => res[0]);

                if (!bookmark) {
                    throw new Error('Bookmark not found');
                }

                if (!bookmark.text) {
                    throw new Error('Bookmark text is empty');
                }

                const extractedData = await extractText(bookmark.text, bookmark.author_name || '');
                
                await db.update(xBookmarks).set({ 
                    summary: extractedData.summary,
                    tags: { tags: extractedData.topics },
                    relevance_score: extractedData.relevanceScore,
                    processed: true,
                 }).where(eq(xBookmarks.id, bookmark.id));

                await db.update(kbProcessingQueue).set({ status: 'done', completedAt: new Date() }).where(eq(kbProcessingQueue.id, item.id));

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await db.update(kbProcessingQueue).set({ status: 'failed', lastError: errorMessage , attempts: (item.attempts ?? 0) + 1}).where(eq(kbProcessingQueue.id, item.id));
            }
        }
        return NextResponse.json({ success: true, processed: itemsToProcess.length });

    } catch (error) {
        console.error('Error processing knowledge base queue:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
