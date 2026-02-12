"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, Check, AlertTriangle, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface IntegrityReport {
  ok: boolean
  synced?: boolean
  timestamp?: string
  summary?: {
    fileChunks: number
    dbEntries: number
    coveragePercent: number
    healthy?: boolean
    missingFromDb?: number
    stale?: number
  }
  issues?: { type: string; source?: string; heading?: string; detail?: string }[]
  error?: string
}

export function MemoryIntegrity() {
  const [report, setReport] = useState<IntegrityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("memory-integrity-last-check")
    return null
  })

  async function runCheck() {
    setLoading(true)
    try {
      const res = await fetch("/api/memory/integrity")
      const data = await res.json()
      setReport(data)
      const now = new Date().toISOString()
      setLastChecked(now)
      localStorage.setItem("memory-integrity-last-check", now)
    } catch (e: any) {
      setReport({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  async function syncAndCheck() {
    setLoading(true)
    try {
      const res = await fetch("/api/memory/integrity", { method: "POST" })
      const data = await res.json()
      setReport(data)
      const now = new Date().toISOString()
      setLastChecked(now)
      localStorage.setItem("memory-integrity-last-check", now)
    } catch (e: any) {
      setReport({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const s = report?.summary
  const healthy = s?.healthy
  const issueCount = report?.issues?.length || 0
  const coverage = s?.coveragePercent ?? 0

  // Determine icon + color
  let Icon = Brain
  let iconClass = "text-muted-foreground/70"
  let tooltipText = "Memory integrity — click to check"

  if (report) {
    if (report.error) {
      Icon = X
      iconClass = "text-red-400"
      tooltipText = `Error: ${report.error}`
    } else if (healthy) {
      Icon = Check
      iconClass = "text-green-400"
      tooltipText = `Healthy — ${coverage}% coverage, ${s?.dbEntries} entries`
    } else {
      Icon = AlertTriangle
      iconClass = issueCount > 3 ? "text-red-400" : "text-amber-400"
      tooltipText = `${issueCount} issue${issueCount !== 1 ? "s" : ""} — ${coverage}% coverage`
    }
  }

  if (lastChecked && !report) {
    tooltipText += ` · Last: ${new Date(lastChecked).toLocaleString()}`
  }

  return (
    <div className="flex items-center gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={runCheck}
              disabled={loading}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Icon className={`h-4 w-4 ${iconClass}`} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{tooltipText}</p>
            {report && !report.error && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Right-click to sync & check</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Show mini badge only when issues exist */}
      {report && !report.error && !healthy && issueCount > 0 && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
          {issueCount}
        </Badge>
      )}

      {report && healthy && (
        <span className="text-[10px] text-green-500/60">{coverage}%</span>
      )}
    </div>
  )
}
