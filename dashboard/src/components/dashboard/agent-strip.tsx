import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Agent {
    agent_id: string
    name: string
    status: string
    level: number
    trust_score: number
    today_tasks?: number
    today_completed?: number
}

interface AgentStripProps {
    agents: Agent[]
}

export function AgentStrip({ agents }: AgentStripProps) {
    return (
        <div className="grid gap-4 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {agents.map((agent) => (
                <Link key={agent.agent_id} href={`/agents/${agent.agent_id}`}>
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer backdrop-blur-sm">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="relative">
                                <Avatar className="h-10 w-10 border border-zinc-700">
                                    <AvatarImage src={`/assets/minion-avatars/${agent.agent_id}.webp`} />
                                    <AvatarImage src="/assets/minion-avatars/default.webp" />
                                    <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${agent.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                        agent.status === 'error' ? 'bg-red-500' : 'bg-zinc-500'
                                    }`} />
                            </div>
                            <div className="flex flex-1 flex-col">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-white">{agent.name}</span>
                                    <img
                                        src={`/assets/rank-icons/rank-${Math.min(agent.level, 10)}.webp`}
                                        alt={`Rank ${agent.level}`}
                                        className="h-8 w-8"
                                        title={`Level ${agent.level}`}
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500/50"
                                            style={{ width: `${(agent.trust_score) * 100}%` }}
                                        />
                                    </div>
                                    {(agent.today_tasks != null && agent.today_tasks > 0) && (
                                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                            {agent.today_completed}/{agent.today_tasks}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
