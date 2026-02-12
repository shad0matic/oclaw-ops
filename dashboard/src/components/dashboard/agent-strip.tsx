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
        <div className="space-y-2">
            {sorted.map((agent) => {
                const isActive = agent.status === 'active' || agent.status === 'running'
                return (
                    <Link key={agent.agent_id} href={`/agents/${agent.agent_id}`} className="block">
                        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-800/60 ${isActive ? 'bg-zinc-800/40' : ''}`}>
                            {/* Avatar with status dot */}
                            <div className="relative shrink-0">
                                <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-7 w-7" />
                                <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-900 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                            </div>

                            {/* Name + badges */}
                            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                    {agent.name}
                                </span>
                                {agent.agent_id === "main" && (
                                    <Badge className="text-[8px] px-1 py-0 h-3 bg-amber-500/15 text-amber-400 border-amber-500/30">Lead</Badge>
                                )}
                                <img
                                    src={`/assets/rank-icons/rank-${Math.min(agent.level, 10)}.webp`}
                                    alt={`L${agent.level}`}
                                    className="h-4 w-4 shrink-0"
                                />
                            </div>

                            {/* Current task or idle */}
                            <div className="flex-1 min-w-0">
                                {isActive && agent.current_task ? (
                                    <p className="text-xs text-green-400/80 truncate" title={agent.current_task}>
                                        ► {agent.current_task}
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-600 truncate">idle</p>
                                )}
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
