import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET - Fetch audit logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('event_type');
    
    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    
    if (eventType) {
      query = db.select().from(auditLogs)
        .where(eq(auditLogs.eventType, eventType))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
    
    const logs = await query;
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// POST - Create audit log entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const result = await db.insert(auditLogs).values({
      eventType: body.event_type,
      detail: body.detail || {},
      ipAddress: body.ip_address || null,
      userAgent: body.user_agent || null
    });
    
    return NextResponse.json({ success: true, id: result[0]?.insertId });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}
