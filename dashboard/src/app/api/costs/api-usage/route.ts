import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  
  try {
    // Get usage summary by service
    const summaryResult = await pool.query(`
      SELECT 
        service,
        model,
        COUNT(*) as call_count,
        SUM(units) as total_units,
        unit_type,
        SUM(cost_usd) as total_cost_usd
      FROM ops.api_usage
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY service, model, unit_type
      ORDER BY total_cost_usd DESC
    `)
    
    // Get recent usage (last 10 calls)
    const recentResult = await pool.query(`
      SELECT 
        id, service, operation, model, units, unit_type, 
        cost_usd, agent_id, input_file, created_at
      FROM ops.api_usage
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    // Get totals
    const totalsResult = await pool.query(`
      SELECT 
        SUM(cost_usd) as total_cost_usd,
        SUM(units) FILTER (WHERE service = 'openai-whisper') as total_whisper_minutes
      FROM ops.api_usage
      WHERE created_at > NOW() - INTERVAL '${days} days'
    `)
    
    return NextResponse.json({
      summary: summaryResult.rows,
      recent: recentResult.rows,
      totals: totalsResult.rows[0],
      days
    })
  } catch (error) {
    console.error('API usage fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch API usage' }, { status: 500 })
  }
}
