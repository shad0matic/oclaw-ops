/**
 * /api/dave/budgets — Budget management endpoints
 * 
 * GET  /api/dave/budgets              List all budgets
 * GET  /api/dave/budgets?agent=<id>   Get specific agent budget
 * POST /api/dave/budgets              Set budget for an agent
 * 
 * Body for POST:
 * {
 *   "agentId": "kevin",
 *   "dailyLimit": 500,      // cents
 *   "weeklyLimit": 2000,    // cents
 *   "monthlyLimit": 8000,   // cents
 *   "alertThreshold": 80    // percentage
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllBudgets,
  getAgentBudget,
  setAgentBudget,
  pauseAgent,
  resumeAgent,
  checkBudgetStatus,
} from '@/lib/dave'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent')

  try {
    if (agentId) {
      const budget = await getAgentBudget(agentId)
      const status = await checkBudgetStatus(agentId)
      return NextResponse.json({ budget, status })
    } else {
      const budgets = await getAllBudgets()
      return NextResponse.json({ budgets })
    }
  } catch (error) {
    console.error('Budget fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, dailyLimit, weeklyLimit, monthlyLimit, alertThreshold, action } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      )
    }

    // Handle pause/resume actions
    if (action === 'pause') {
      const reason = body.reason || 'Manual pause via API'
      await pauseAgent(agentId, reason)
      return NextResponse.json({ success: true, action: 'paused', agentId })
    }

    if (action === 'resume') {
      await resumeAgent(agentId)
      return NextResponse.json({ success: true, action: 'resumed', agentId })
    }

    // Set budget
    const budget = await setAgentBudget(agentId, {
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
      alertThreshold,
    })

    return NextResponse.json({ success: true, budget })
  } catch (error) {
    console.error('Budget update error:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}
