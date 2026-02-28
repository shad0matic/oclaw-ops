export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { updateRateLimits } from "@/lib/dave/db"

const rateLimitUpdateSchema = z.object({
  provider: z.string(),
  limits: z.array(z.object({
    metricType: z.string(),  // 'requests', 'input_tokens', 'output_tokens'
    limit: z.number(),
    remaining: z.number(),
    resetAt: z.string().optional(),  // ISO timestamp
  })),
})

/**
 * POST /api/dave/rate-limits
 * 
 * Update rate limit info from API response headers
 * 
 * Body:
 *   - provider: string (e.g., 'anthropic')
 *   - limits: array of { metricType, limit, remaining, resetAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = rateLimitUpdateSchema.parse(body)

    await updateRateLimits(
      parsed.provider,
      parsed.limits.map(l => ({
        ...l,
        resetAt: l.resetAt ? new Date(l.resetAt) : undefined,
      }))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Dave rate-limits POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
