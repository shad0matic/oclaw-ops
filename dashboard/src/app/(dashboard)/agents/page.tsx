import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AgentAvatar } from "@/components/ui/agent-avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Trophy, Zap, Activity } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

import { ZombieActions } from "@/components/agents/AgentActions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default async function AgentsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const agents = await prisma.agent_profiles.findMany({
        orderBy: { agent_id: 'asc' }
    })

    // Enrich agents
    const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
        const activeRun = await prisma.runs.findFirst({
            where: { agent_id: agent.agent_id, status: "running" }
        })

        const lastEvent = await prisma.agent_events.findFirst({
            where: { agent_id: agent.agent_id },
            orderBy: { created_at: 'desc' }
        })

        return {
            ...agent,
            status: activeRun ? "running" : "idle",
            zombie_status: activeRun?.zombie_status,
            session_key: activeRun?.session_key,
            last_active: lastEvent?.created_at || agent.updated_at,
            trust_percent: (Number(agent.trust_score) || 0) * 100
        }
    }))

    const totalTasks = enrichedAgents.reduce((acc: any, curr: any) => acc + (curr.total_tasks || 0), 0)
    const avgTrust = enrichedAgents.length > 0
        ? enrichedAgents.reduce((acc: any, curr: any) => acc + curr.trust_percent, 0) / enrichedAgents.length
        : 0

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Agents" subtitle="Monitor and manage your minion workforce — trust levels, task stats, and performance." />
            </div>

            {/* Summary Bar */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{agents.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Trust Score</CardTitle>
                        <Trophy className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{avgTrust.toFixed(1)}%</div>
                        <Progress value={avgTrust} className="mt-2 h-1" />
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                        <Zap className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Agents — Mobile Cards */}
            <div className="grid gap-3 md:hidden">
                {enrichedAgents.map((agent: any) => (
                    <Link key={agent.id} href={`/agents/${agent.agent_id}`}>
                        <Card className="bg-card/50 border-border hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-10 w-10 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {agent.zombie_status === 'suspected' && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <span className="text-xl animate-pulse">🧟</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Suspected Zombie</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <span className="font-medium text-foreground truncate">{agent.name}</span>
                                            <img src={`/assets/rank-icons/rank-${Math.min(agent.level, 10)}.webp`} alt={`L${agent.level}`} className="h-5 w-5 shrink-0" />
                                            <Badge variant={agent.status === 'running' ? 'default' : 'secondary'} className={`shrink-0 text-[10px] px-1.5 py-0 ${
                                                agent.status === 'running' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {agent.status}
                                            </Badge>
                                        </div>
                                        {agent.description && <p className="text-xs text-muted-foreground/70 truncate">{agent.description}</p>}
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>Trust {agent.trust_percent.toFixed(0)}%</span>
                                            <span>{agent.successful_tasks}/{agent.total_tasks} tasks</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Agents — Desktop Table */}
            <Card className="bg-card/50 border-border hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground">Agent</TableHead>
                            <TableHead className="text-muted-foreground">Status</TableHead>
                            <TableHead className="text-muted-foreground">Trust Score</TableHead>
                            <TableHead className="text-muted-foreground">Tasks</TableHead>
                            <TableHead className="text-muted-foreground">Last Active</TableHead>
                            <TableHead className="text-right text-muted-foreground">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrichedAgents.map((agent: any) => (
                            <TableRow key={agent.id} className="border-border hover:bg-muted/50">
                                <TableCell className="font-medium text-foreground">
                                    <div className="flex items-center gap-3">
                                        <AgentAvatar agentId={agent.agent_id} fallbackText={agent.name.substring(0, 2)} className="h-8 w-8 shrink-0" />
                                        <div className="flex flex-col min-w-0" title={agent.description || ''}>
                                            <div className="flex items-center gap-2">
                                                {agent.zombie_status === 'suspected' && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <span className="text-xl animate-pulse">🧟</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Suspected Zombie</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                <span className="truncate">{agent.name}</span>
                                            </div>
                                            {agent.description && <span className="text-xs text-muted-foreground/70 truncate max-w-[250px]">{agent.description}</span>}
                                            <span className="flex items-center gap-1">
                                                <img src={`/assets/rank-icons/rank-${Math.min(agent.level, 10)}.webp`} alt={`Rank ${agent.level}`} className="h-6 w-6" />
                                                <span className="text-amber-500 text-[10px]">L{agent.level}</span>
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={agent.status === 'running' ? 'default' : 'secondary'} className={
                                        agent.status === 'running' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' :
                                            'bg-muted text-muted-foreground hover:bg-zinc-700'
                                    }>
                                        {agent.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={agent.trust_percent} className="w-[60px] h-2" />
                                        <span className="text-xs text-muted-foreground">{agent.trust_percent.toFixed(0)}%</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs text-muted-foreground">
                                        <span className="text-foreground">{agent.successful_tasks} / {agent.total_tasks}</span>
                                        <span>{agent.total_tasks ? ((agent.successful_tasks! / agent.total_tasks) * 100).toFixed(0) : 0}% success</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {agent.zombie_status === 'suspected' ? (
                                        <ZombieActions sessionId={agent.session_key} />
                                    ) : (
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/agents/${agent.agent_id}`}>
                                                <ArrowRight className="h-6 w-6" />
                                            </Link>
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function UsersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
