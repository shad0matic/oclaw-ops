export const dynamic = "force-dynamic"
import { db } from '@/lib/drizzle'
import { researchIdeasInOps } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db.select().from(researchIdeasInOps).$dynamic()
  if (status) {
    query = query.where(eq(researchIdeasInOps.status, status))
  }

  const ideas = await query.orderBy(desc(researchIdeasInOps.createdAt))
  return NextResponse.json(ideas.map(i => ({ ...i, id: String(i.id) })))
}
