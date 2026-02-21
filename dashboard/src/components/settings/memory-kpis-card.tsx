"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Health = "healthy" | "warning" | "critical"

type MemoryStats = {
  agent_id: string
  overall_health: Health
  tier1_active_context: {
    model: string | null
    total_tokens_estimate: number
    usage_percentage_estimate: number
    context_health: Health
    updated_at: string | null
  }
  tier2_memory_flush: {
    flush_count_1h: number
    flush_count_24h: number
    last_flush_at: string | null
    flush_health: Health
  }
  tier3_longterm_storage: {
    total_memories: number
    total_daily_notes: number
    storage_health: Health
  }
  limits: { model_max_tokens: number }
  notes: { tier1_is_estimate: boolean; tier1_source: string }
}

function healthBadgeVariant(h: Health) {
  if (h === "critical") return "destructive"
  if (h === "warning") return "secondary"
  return "default"
}

function fmtTs(ts: string | null) {
  if (!ts) return "—"
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

export function MemoryKpisCard({ agentId = "main" }: { agentId?: string }) {
  const [data, setData] = useState<MemoryStats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setErr(null)
      try {
        const res = await fetch(`/api/memory-stats?agent_id=${encodeURIComponent(agentId)}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as MemoryStats
        if (alive) setData(json)
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [agentId])

  const overall = data?.overall_health

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>🧠 Memory KPIs</CardTitle>
          <div className="text-sm text-muted-foreground">
            Tier 1/2/3 health snapshot (auto-refresh 30s)
          </div>
        </div>
        {overall ? (
          <Badge variant={healthBadgeVariant(overall)}>{overall.toUpperCase()}</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
        {err ? <div className="text-sm text-red-400">Error: {err}</div> : null}

        {data ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="py-4">
              <CardHeader className="px-4 py-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tier 1 — Active Context</CardTitle>
                  <Badge variant={healthBadgeVariant(data.tier1_active_context.context_health)}>
                    {data.tier1_active_context.context_health}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Usage (estimate): </span>
                  <span className="font-medium">{data.tier1_active_context.usage_percentage_estimate}%</span>
                  <span className="text-muted-foreground"> of {data.limits.model_max_tokens}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens (estimate): </span>
                  <span className="font-medium">{data.tier1_active_context.total_tokens_estimate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model: </span>
                  <span className="font-medium">{data.tier1_active_context.model || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated: </span>
                  <span className="font-medium">{fmtTs(data.tier1_active_context.updated_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Note: Tier 1 is a proxy from live session totals.
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardHeader className="px-4 py-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tier 2 — Memory Flush</CardTitle>
                  <Badge variant={healthBadgeVariant(data.tier2_memory_flush.flush_health)}>
                    {data.tier2_memory_flush.flush_health}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Flushes (1h): </span>
                  <span className="font-medium">{data.tier2_memory_flush.flush_count_1h}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Flushes (24h): </span>
                  <span className="font-medium">{data.tier2_memory_flush.flush_count_24h}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last flush: </span>
                  <span className="font-medium">{fmtTs(data.tier2_memory_flush.last_flush_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Source: memory.memories tag = memory-flush
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardHeader className="px-4 py-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tier 3 — Long-term Storage</CardTitle>
                  <Badge variant={healthBadgeVariant(data.tier3_longterm_storage.storage_health)}>
                    {data.tier3_longterm_storage.storage_health}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Memories: </span>
                  <span className="font-medium">{data.tier3_longterm_storage.total_memories}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily notes: </span>
                  <span className="font-medium">{data.tier3_longterm_storage.total_daily_notes}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Source: memory schema tables
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
