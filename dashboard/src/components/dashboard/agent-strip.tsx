"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AgentAvatar } from "@/components/ui/agent-avatar"
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
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'running');
    const idleAgents = agents.filter(a => a.status !== 'active' && a.status !== 'running');

    const AgentCard = ({ agent }: { agent: Agent }) => (
        <Link href={`/agents/${agent.agent_id}`}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer backdrop-blur-sm h-full">
                <CardContent className="flex flex-col justify-between gap-2 p-3">
                    <div className="flex items-center gap-3">
                        <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-9 w-9" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-white truncate">{agent.name}</span>
                                <img
                                    src={`/assets/rank-icons/rank-${Math.min(agent.level, 10)}.webp`}
                                    alt={`Rank ${agent.level}`}
                                    className="h-6 w-6 shrink-0"
                                    title={`Level ${agent.level}`}
                                />
                            </div>
                            <div className="h-1 mt-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500/50"
                                    style={{ width: `${(agent.trust_score) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    {agent.current_task && (
                        <p className="text-xs text-zinc-400 bg-zinc-800/50 rounded px-2 py-1 truncate" title={agent.current_task}>
                            <span className="text-green-400">►</span> {agent.current_task}
                        </p>
                    )}
                </CardContent>
            </Card>
        </Link>
    );

    return (
        <div className="space-y-4">
            {activeAgents.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-zinc-400 mb-2">Active Minions</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {activeAgents.map((agent) => <AgentCard key={agent.agent_id} agent={agent} />)}
                    </div>
                </div>
            )}
            
            {idleAgents.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-zinc-400 mb-2">Idle Minions</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {idleAgents.map((agent) => <AgentCard key={agent.agent_id} agent={agent} />)}
                    </div>
                </div>
            )}
        </div>
    )
}
