"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface IntegrityReport {
  ok: boolean
  synced?: boolean
  timestamp?: string
  files?: { total: number; list: { file: string; chunks: number; bytes: number }[] }
  db?: { total: number; withEmbeddings: number; sources: string[] }
  issues?: { type: string; source?: string; heading?: string; detail?: string; preview?: string }[]
  summary?: {
    fileChunks: number
    dbEntries: number
    matched?: number
    missingFromDb?: number
    stale?: number
    orphaned?: number
    missingEmbeddings?: number
    coveragePercent: number
    healthy?: boolean
  }
  error?: string
}

export function MemoryIntegrity() {
  const [report, setReport] = useState<IntegrityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  async function runCheck() {
    setLoading(true)
    try {
      const res = await fetch("/api/memory/integrity")
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      setReport({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  async function syncAndCheck() {
    setSyncing(true)
    try {
      const res = await fetch("/api/memory/integrity", { method: "POST" })
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      setReport({ ok: false, error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const s = report?.summary
  const coverage = s?.coveragePercent ?? 0
  const coverageColor =
    coverage >= 90 ? "text-green-400" : coverage >= 60 ? "text-amber-400" : "text-red-400"
  const coverageBg =
    coverage >= 90 ? "bg-green-500" : coverage >= 60 ? "bg-amber-500" : "bg-red-500"

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-zinc-400 text-sm font-medium">🧠 Memory Integrity</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runCheck}
            disabled={loading || syncing}
            className="h-7 text-xs border-zinc-700 hover:bg-zinc-800"
          >
            {loading ? "Checking…" : "Check"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncAndCheck}
            disabled={loading || syncing}
            className="h-7 text-xs border-zinc-700 hover:bg-zinc-800"
          >
            {syncing ? "Syncing…" : "Sync & Check"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!report && !loading && (
          <p className="text-zinc-500 text-sm">Click Check to compare flat files vs Postgres memory</p>
        )}

        {report?.error && (
          <p className="text-red-400 text-sm">❌ {report.error}</p>
        )}

        {s && (
          <div className="space-y-3">
            {/* Coverage bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Coverage</span>
                <span className={coverageColor}>{coverage}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${coverageBg} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(coverage, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">File chunks</span>
                <span className="text-zinc-300">{s.fileChunks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">DB entries</span>
                <span className="text-zinc-300">{s.dbEntries}</span>
              </div>
              {s.matched !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Matched</span>
                  <span className="text-green-400">{s.matched}</span>
                </div>
              )}
              {(s.missingFromDb ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Missing from DB</span>
                  <span className="text-red-400">{s.missingFromDb}</span>
                </div>
              )}
              {(s.stale ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Stale</span>
                  <span className="text-amber-400">{s.stale}</span>
                </div>
              )}
              {(s.orphaned ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Orphaned</span>
                  <span className="text-zinc-400">{s.orphaned}</span>
                </div>
              )}
            </div>

            {/* Health badge */}
            <div className="flex items-center gap-2">
              {s.healthy ? (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                  ✅ Healthy — all synced
                </Badge>
              ) : report.synced ? (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                  🔄 Synced — re-checked
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                  ⚠️ {report.issues?.length || 0} issue{(report.issues?.length || 0) !== 1 ? "s" : ""} found
                </Badge>
              )}
              {report.timestamp && (
                <span className="text-[10px] text-zinc-600">
                  {new Date(report.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Issues list (collapsed if >5) */}
            {report.issues && report.issues.length > 0 && (
              <IssuesList issues={report.issues} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IssuesList({ issues }: { issues: NonNullable<IntegrityReport["issues"]> }) {
  const [expanded, setExpanded] = useState(false)
  const show = expanded ? issues : issues.slice(0, 5)

  const typeEmoji: Record<string, string> = {
    missing_from_db: "🔴",
    stale: "🟡",
    orphaned_in_db: "⚪",
    missing_embedding: "🟠",
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-zinc-500 font-medium">Issues:</p>
      {show.map((issue, i) => (
        <div key={i} className="text-xs text-zinc-400 flex gap-1.5">
          <span>{typeEmoji[issue.type] || "•"}</span>
          <span>
            <span className="text-zinc-500">{issue.source || ""}</span>
            {issue.heading && <span> → {issue.heading}</span>}
            {issue.detail && <span className="text-zinc-600"> — {issue.detail}</span>}
          </span>
        </div>
      ))}
      {issues.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {expanded ? "Show less" : `+${issues.length - 5} more…`}
        </button>
      )}
    </div>
  )
}
