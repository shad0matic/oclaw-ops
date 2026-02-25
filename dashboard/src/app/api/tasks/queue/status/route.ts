import { db, pool } from "@/lib/drizzle";
import { taskQueueInOps } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const startTime = Date.now();
    
    const result = await db.select({ count: taskQueueInOps.id })
      .from(taskQueueInOps)
      .where(eq(taskQueueInOps.status, 'planned'));
    
    const latency = Date.now() - startTime;
    
    const tasks = result.length;

    return NextResponse.json({ tasks, latency });
  } catch (error) {
    console.error('Failed to fetch queue status:', error);
    return new Response('Failed to fetch queue status', { status: 500 });
  }
}
