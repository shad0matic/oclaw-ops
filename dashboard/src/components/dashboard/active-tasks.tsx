"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle2, XCircle, Skull } from "lucide-react"

interface ActiveTask {
    id: number
    agentId: string
    agentName: string
    task: string
    status: string
    heartbeatMsg: string | null
    elapsedSeconds: number
    sinceHeartbeat: number
    timeoutSeconds: number
    isStalled: boolean
    startedAt: string
}

interface RecentTask {
    id: number
    agentId: string
    agentName: string
    task: string
    status: string
    heartbeatMsg: string | null
    durationSeconds: number
    completedAt: string
}

const AGENT_EMOJI: Record<string, string> = {
    main: "🍌",
    nefario: "🔬",
    bob: "🎨",
    xreader: "📰",
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function StatusBadge({ status, isStalled }: { status: string; isStalled?: boolean }) {
    if (isStalled || status === "stalled") {
        return <Badge className="bg-red-500/10 text-red-400 animate-pulse"><Skull className="mr-1 h-3 w-3" />STALLED</Badge>
    }
    switch (status) {
        case "running":
            return <Badge className="bg-blue-500/10 text-blue-400"><Clock className="mr-1 h-3 w-3 animate-spin" />In Progress</Badge>
        case "completed":
            return <Badge className="bg-green-500/10 text-green-400"><CheckCircle2 className="mr-1 h-3 w-3" />Done</Badge>
        case "failed":
            return <Badge className="bg-red-500/10 text-red-400"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>
        default:
            return <Badge className="bg-zinc-500/10 text-zinc-400">{status}</Badge>
    }
}

export function ActiveTasks() {
    const [active, setActive] = useState<ActiveTask[]>([])
    const [recent, setRecent] = useState<RecentTask[]>([])
    const [tick, setTick] = useState(0)

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch("/api/tasks/active")
            if (res.ok) {
                const data = await res.json()
                setActive(data.active)
                setRecent(data.recent)
            }
        } catch {}
    }, [])

    // Fetch every 10s
    useEffect(() => {
        fetchTasks()
        const interval = setInterval(fetchTasks, 10_000)
        return () => clearInterval(interval)
    }, [fetchTasks])

    // Tick every second for live elapsed counter
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-zinc-400 text-base">Agent Tasks</CardTitle>
                    {active.length > 0 && (
                        <span className="text-xs text-blue-400 animate-pulse">
                            {active.length} active
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {active.length === 0 && recent.length === 0 && (
                    <p className="text-zinc-500 text-sm text-center py-4">No tracked tasks right now</p>
                )}
                {/* Active tasks */}
                {active.map(task => {
                    const elapsed = task.elapsedSeconds + tick % 1000 // Rough live counter
                    const emoji = AGENT_EMOJI[task.agentId] || "🤖"
                    const heartbeatAge = task.sinceHeartbeat + tick % 1000
                    const healthPct = Math.max(0, 100 - (heartbeatAge / task.timeoutSeconds) * 100)

                    return (
                        <div key={task.id} className={`p-3 rounded-lg border ${
                            task.isStalled 
                                ? 'border-red-500/50 bg-red-500/5' 
                                : 'border-zinc-800 bg-zinc-950/50'
                        }`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-lg">{emoji}</span>
                                    <span className="font-medium text-white truncate">{task.agentName}</span>
                                </div>
                                <StatusBadge status={task.status} isStalled={task.isStalled} />
                            </div>
                            <p className="text-sm text-zinc-300 mb-1.5 truncate" title={task.task}>
                                "{task.task}"
                            </p>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span className="font-mono">{formatDuration(elapsed)}</span>
                                {task.heartbeatMsg && (
                                    <span className="truncate ml-2 text-zinc-400">💓 {task.heartbeatMsg}</span>
                                )}
                            </div>
                            {/* Heartbeat health bar */}
                            <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        healthPct > 60 ? 'bg-green-500' : healthPct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(2, healthPct)}%` }}
                                />
                            </div>
                        </div>
                    )
                })}

                {/* Recent completed/failed */}
                {recent.length > 0 && (
                    <>
                        {active.length > 0 && <div className="border-t border-zinc-800 pt-2" />}
                        <p className="text-xs text-zinc-600 uppercase tracking-wider">Recent</p>
                        {recent.map(task => {
                            const emoji = AGENT_EMOJI[task.agentId] || "🤖"
                            return (
                                <div key={task.id} className="flex items-center gap-2 py-1 text-sm">
                                    <span>{emoji}</span>
                                    <span className="text-zinc-400 truncate flex-1">{task.agentName} — "{task.task}"</span>
                                    <span className="text-xs font-mono text-zinc-500">
                                        {task.durationSeconds != null ? formatDuration(task.durationSeconds) : '—'}
                                    </span>
                                    <StatusBadge status={task.status} />
                                </div>
                            )
                        })}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
