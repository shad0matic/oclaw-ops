"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentAvatar } from "@/components/ui/agent-avatar"
import { Badge } from "@/components/ui/badge"
import { Radio } from "lucide-react"

interface AgentStatus {
    agent_id: string
    name: string
    status: "active" | "idle" | "error"
    current_task: string | null
    last_seen: string | null
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "never"
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const min = Math.round(diffMs / 60000)
    if (min < 1) return "just now"
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    return `${Math.floor(hr / 24)}d ago`
}

const statusConfig = {
    active: { label: "Working", dot: "bg-green-500 animate-pulse", badge: "bg-green-500/10 text-green-400 border-green-500/20" },
    idle: { label: "Idle", dot: "bg-zinc-500", badge: "bg-muted text-muted-foreground border-border" },
    error: { label: "Error", dot: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
}

export function AgentLiveStatus() {
    const [agents, setAgents] = useState<AgentStatus[]>([])
    const [loading, setLoading] = useState(true)

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/agents/live")
            if (res.ok) setAgents(await res.json())
        } catch {} finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 15_000) // Refresh every 15s
        return () => clearInterval(interval)
    }, [])

    return (
        <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-muted-foreground flex items-center gap-2">
                    <Radio className="h-4 w-4 text-green-500" />
                    Live Status
                </CardTitle>
                <span className="text-[10px] text-muted-foreground/50">auto-refresh 15s</span>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-muted-foreground/70 text-sm">Loading...</div>
                ) : agents.length === 0 ? (
                    <div className="text-muted-foreground/70 text-sm">No agents registered</div>
                ) : (
                    <div className="space-y-3">
                        {agents.map((agent) => {
                            const cfg = statusConfig[agent.status]
                            return (
                                <div key={agent.agent_id} className="flex items-center gap-3">
                                    <div className="relative">
                                        <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-8 w-8" />
                                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${cfg.dot}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{agent.name}</span>
                                            {agent.agent_id === "main" && (
                                                <Badge className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/15 text-amber-400 border-amber-500/30">Lead</Badge>
                                            )}
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${cfg.badge}`}>
                                                {cfg.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground/70 truncate" title={agent.current_task || ''}>
                                            {agent.current_task || "No active task"}
                                            {agent.last_seen && (
                                                <span className="text-muted-foreground/50"> · {timeAgo(agent.last_seen)}</span>
                                            )}
                                        </p>
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
