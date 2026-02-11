"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAgent } from "@/lib/agent-names"

interface WorktreeTask {
  id: number
  agent_id: string
  repo: string
  branch: string
  description: string
  file_manifest: string[]
  status: string
  elapsed: number
  started_at: string
}

interface FileClaim {
  agent_id: string
  file_path: string
  description: string
  claimed_at: string
}

interface RecentTask {
  id: number
  agent_id: string
  repo: string
  description: string
  status: string
  completed_at: string
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}

function statusConfig(status: string) {
  switch (status) {
    case "in_progress":
      return { label: "Working", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" }
    case "assigned":
      return { label: "Queued", color: "bg-zinc-800 text-zinc-400 border-zinc-700", dot: "bg-zinc-400" }
    case "review":
      return { label: "Review", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", dot: "bg-purple-400" }
    case "merging":
      return { label: "Merging", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" }
    case "merged":
      return { label: "Merged", color: "bg-green-500/10 text-green-400 border-green-500/20", dot: "bg-green-400" }
    case "failed":
      return { label: "Failed", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" }
    case "cancelled":
      return { label: "Cancelled", color: "bg-zinc-800 text-zinc-500 border-zinc-700", dot: "bg-zinc-500" }
    default:
      return { label: status, color: "bg-zinc-800 text-zinc-400", dot: "bg-zinc-400" }
  }
}

function shortPath(filePath: string): string {
  const parts = filePath.split("/")
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : filePath
}

export function WorktreeStatus() {
  const [active, setActive] = useState<WorktreeTask[]>([])
  const [claims, setClaims] = useState<FileClaim[]>([])
  const [recent, setRecent] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const res = await fetch("/api/worktrees")
      const data = await res.json()
      if (data.ok) {
        setActive(data.active || [])
        setClaims(data.claims || [])
        setRecent(data.recent || [])
      }
    } catch { }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalLocks = active.length + claims.length
  const hasActivity = totalLocks > 0 || recent.length > 0

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-400 text-sm font-medium">
            🔒 Workspace Locks
          </CardTitle>
          {totalLocks > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
              {totalLocks} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : !hasActivity ? (
          <p className="text-zinc-500 text-sm">No active locks or recent merges</p>
        ) : (
          <div className="space-y-4">
            {/* Active worktree tasks */}
            {active.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Worktrees</p>
                {active.map((task) => {
                  const agent = getAgent(task.agent_id)
                  const sc = statusConfig(task.status)
                  return (
                    <div key={`wt-${task.id}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{agent.emoji}</span>
                        <span className="font-medium text-zinc-200 text-sm truncate flex-1">
                          {task.description}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1 inline-block ${task.status === "in_progress" ? "animate-pulse" : ""}`} />
                          {sc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span>{agent.name}</span>
                        <span>•</span>
                        <span className="font-mono text-zinc-600">{task.repo}</span>
                        <span>•</span>
                        <span>{formatElapsed(task.elapsed)}</span>
                      </div>
                      {task.file_manifest.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.file_manifest.map((f, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5 font-mono"
                              title={f}
                            >
                              {shortPath(f)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* File claims */}
            {claims.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">File Claims</p>
                {claims.map((claim, i) => {
                  const agent = getAgent(claim.agent_id)
                  return (
                    <div key={`fc-${i}`} className="flex items-center gap-2 text-xs">
                      <span>{agent.emoji}</span>
                      <span className="text-zinc-400">{agent.name}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="font-mono text-zinc-500 truncate" title={claim.file_path}>
                        {shortPath(claim.file_path)}
                      </span>
                      {claim.description && (
                        <span className="text-zinc-600 truncate">({claim.description})</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recently merged */}
            {recent.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Recent (24h)</p>
                {recent.map((task) => {
                  const agent = getAgent(task.agent_id)
                  const sc = statusConfig(task.status)
                  return (
                    <div key={`rc-${task.id}`} className="flex items-center gap-2 text-xs">
                      <span>{agent.emoji}</span>
                      <span className="text-zinc-400 truncate flex-1">{task.description}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${sc.color}`}>
                        {task.status === "merged" ? "🔀" : task.status === "failed" ? "❌" : "⊘"} {sc.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
