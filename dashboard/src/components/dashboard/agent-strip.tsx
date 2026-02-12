"use client"

import { AgentAvatar } from "@/components/ui/agent-avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Agent {
    agent_id: string
    name: string
    status: string
    level: number
    trust_score: number
    current_task?: string | null
}

interface AgentStripProps {
    agents: Agent[]
}

export function AgentStrip({ agents }: AgentStripProps) {
    // Sort: active first, then idle
    const sorted = [...agents].sort((a, b) => {
        const aActive = a.status === 'active' || a.status === 'running' ? 0 : 1
        const bActive = b.status === 'active' || b.status === 'running' ? 0 : 1
        return aActive - bActive
    })

    return (
        <div className="grid grid-cols-2 md:grid-cols-1 gap-1">
            {sorted.map((agent) => {
                const isActive = agent.status === 'active' || agent.status === 'running'
                return (
                    <Link key={agent.agent_id} href={`/agents/${agent.agent_id}`} className="block">
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-muted/60 ${isActive ? 'bg-muted/40' : ''}`}>
                            {/* Avatar with status dot */}
                            <div className="relative shrink-0">
                                <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-6 w-6" />
                                <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${isActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                            </div>

                            {/* Name + task */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                    <span className={`text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                                        {agent.name}
                                    </span>
                                    {agent.agent_id === "main" && (
                                        <Badge className="text-[7px] px-0.5 py-0 h-2.5 bg-amber-500/15 text-amber-400 border-amber-500/30">Lead</Badge>
                                    )}
                                </div>
                                {isActive && agent.current_task ? (
                                    <p className="text-[10px] text-green-400/80 truncate" title={agent.current_task}>► {agent.current_task}</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50">idle</p>
                                )}
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
