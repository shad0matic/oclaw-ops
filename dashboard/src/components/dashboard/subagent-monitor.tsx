"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentAvatar } from "@/components/ui/agent-avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SubAgentRun {
    agent_id: string
    task: string
    spawned_by: string
    model: string
    status: "completed" | "running" | "failed" | "zombie"
    duration_minutes: number | null
    started_at: string
}

const statusConfig = {
    completed: { label: "Completed", dot: "bg-green-500", badge: "bg-green-500/10 text-green-400 border-green-500/20" },
    running: { label: "Running", dot: "bg-blue-500 animate-pulse", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    failed: { label: "Failed", dot: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
    zombie: { label: "Zombie", dot: "bg-amber-600", badge: "bg-red-500/5 text-amber-500 border-red-500/20" },
}

const modelColors: Record<string, string> = {
    opus: "bg-red-500",
    sonnet: "bg-red-400",
    grok: "bg-yellow-500",
    gemini: "bg-green-500",
    flash: "bg-green-400",
    gpt: "bg-blue-500",
}

function getModelColor(model: string): string {
    const lower = model.toLowerCase()
    for (const [key, color] of Object.entries(modelColors)) {
        if (lower.includes(key)) return color
    }
    return "bg-zinc-500"
}

function formatDuration(minutes: number | null): string {
    if (minutes === null) return "Running..."
    if (minutes < 1) return "<1m"
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
}

export function SubAgentMonitor() {
    const [runs, setRuns] = useState<SubAgentRun[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRuns = async () => {
        try {
            const res = await fetch("/api/agents/sessions")
            if (res.ok) setRuns(await res.json())
        } catch (err) {
            console.error("Failed to fetch sub-agent runs:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRuns()
        const interval = setInterval(fetchRuns, 30_000) // Refresh every 30s
        return () => clearInterval(interval)
    }, [])

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-zinc-400 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sub-Agents
                </CardTitle>
                <span className="text-[10px] text-zinc-600">auto-refresh 30s</span>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-zinc-500 text-sm">Loading...</div>
                ) : runs.length === 0 ? (
                    <div className="text-zinc-500 text-sm">No sub-agent activity in the last 24h</div>
                ) : (
                    <div className="space-y-3">
                        {runs.map((run, idx) => {
                            const cfg = statusConfig[run.status]
                            const isZombie = run.status === "zombie"
                            
                            return (
                                <div 
                                    key={`${run.agent_id}-${run.started_at}-${idx}`} 
                                    className={`flex items-start gap-3 p-2 rounded-lg ${isZombie ? 'bg-red-500/5' : ''}`}
                                >
                                    <div className="relative">
                                        <AgentAvatar 
                                            agentId={run.agent_id} 
                                            fallbackText={run.agent_id.substring(0, 2)} 
                                            className="h-8 w-8" 
                                        />
                                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${cfg.dot}`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white capitalize">{run.agent_id}</span>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${cfg.badge}`}>
                                                {isZombie && <Skull className="h-2.5 w-2.5 mr-0.5" />}
                                                {cfg.label}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                <div className={`h-1.5 w-1.5 rounded-full ${getModelColor(run.model)}`} />
                                                <span className="text-[10px] text-zinc-500">{run.model.split('/').pop()}</span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs text-zinc-400 line-clamp-2" title={run.task}>
                                            {run.task}
                                        </p>
                                        
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                                            <span>by {run.spawned_by}</span>
                                            <span>•</span>
                                            <span>{formatDuration(run.duration_minutes)}</span>
                                            {isZombie && (
                                                <>
                                                    <span>•</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="h-4 px-1.5 text-[9px] text-amber-500 hover:text-amber-400 hover:bg-red-500/10"
                                                                    disabled
                                                                >
                                                                    Kill
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Coming soon</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
