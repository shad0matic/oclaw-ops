"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle2, XCircle, Skull, Zap } from "lucide-react"
import { getModelEntry } from "../settings/model-display-config"

const MODEL_RATES: Record<string, number> = {
    "anthropic/claude-3-opus-20240229": 0.10,
    "google/gemini-pro": 0.005,
    "groq/llama3-70b-8192": 0.02,
    "openai/gpt-4-turbo": 0.03,
}

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
    model?: string
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
    model?: string
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

function ModelChip({ modelId }: { modelId: string }) {
    const model = getModelEntry(modelId)
    if (!model) return null
    return (
        <Badge
            className="font-mono text-xs"
            style={{ backgroundColor: model.color, color: "#111" }}
        >
            {model.icon} {model.label}
        </Badge>
    )
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
        <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-muted-foreground text-base">Agent Tasks</CardTitle>
                    {active.length > 0 && (
                        <span className="text-xs text-blue-400 animate-pulse">
                            {active.length} active
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {active.length === 0 && recent.length === 0 && (
                    <p className="text-muted-foreground/70 text-sm text-center py-4">No tracked tasks right now</p>
                )}
                {/* Active tasks */}
                {active.map(task => {
                    const elapsed = task.elapsedSeconds + tick % 1000 // Rough live counter
                    const emoji = AGENT_EMOJI[task.agentId] || "🤖"
                    const heartbeatAge = task.sinceHeartbeat + tick % 1000
                    const healthPct = Math.max(0, 100 - (heartbeatAge / task.timeoutSeconds) * 100)

                    const costPerMinute = task.model ? MODEL_RATES[task.model] : 0
                    const estimatedCost = costPerMinute ? (elapsed / 60) * costPerMinute : 0
                    const modelEntry = task.model ? getModelEntry(task.model) : null
                    const warnThreshold = modelEntry?.warnThreshold || 999
                    const showWarning = estimatedCost > warnThreshold

                    return (
                        <div key={task.id} className={`p-3 rounded-lg border ${
                            task.isStalled 
                                ? 'border-red-500/50 bg-red-500/5' 
                                : 'border-border bg-background/50'
                        }`}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-lg">{emoji}</span>
                                <span className="font-medium text-foreground">{task.agentName}</span>
                                {task.model && <ModelChip modelId={task.model} />}
                                <StatusBadge status={task.status} isStalled={task.isStalled} />
                            </div>
                            <p className="text-sm text-foreground/80 mb-1.5 break-words" title={task.task}>
                                "{task.task}"
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap">
                                <span className="font-mono">⏱ {formatDuration(elapsed)}</span>
                                {estimatedCost > 0 && (
                                    <span className="flex items-center gap-1 font-mono">
                                        · ~€{estimatedCost.toFixed(2)}
                                        {showWarning && (
                                            <AlertTriangle className="h-3 w-3 text-orange-400" />
                                        )}
                                    </span>
                                )}
                                {task.heartbeatMsg && (
                                    <span className="text-muted-foreground break-all">💓 {task.heartbeatMsg}</span>
                                )}
                            </div>
                            {/* Heartbeat health bar */}
                            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
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
                        {active.length > 0 && <div className="border-t border-border pt-2" />}
                        <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Recent</p>
                        {recent.map(task => {
                            const emoji = AGENT_EMOJI[task.agentId] || "🤖"
                            const costPerMinute = task.model ? MODEL_RATES[task.model] : 0
                            const estimatedCost = costPerMinute ? (task.durationSeconds / 60) * costPerMinute : 0
                            
                            return (
                                <div key={task.id} className="py-1.5 text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span>{emoji}</span>
                                        <span className="text-muted-foreground">{task.agentName}</span>
                                        {task.model && <ModelChip modelId={task.model} />}
                                        <StatusBadge status={task.status} />
                                    </div>
                                    <p className="text-xs text-muted-foreground/70 break-words mt-0.5">
                                        "{task.task}"
                                        <span className="font-mono ml-2">
                                            {task.durationSeconds != null ? formatDuration(task.durationSeconds) : '—'}
                                            {estimatedCost > 0.01 && ` · ~€${estimatedCost.toFixed(2)}`}
                                        </span>
                                    </p>
                                </div>
                            )
                        })}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

