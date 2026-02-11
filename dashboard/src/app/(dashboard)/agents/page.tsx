import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Trophy, Zap, Activity } from "lucide-react"

export default async function AgentsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const agents = await prisma.agent_profiles.findMany({
        orderBy: { agent_id: 'asc' }
    })

    // Enrich agents
    const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
        const activeStep = await prisma.steps.findFirst({
            where: { agent_id: agent.agent_id, status: "running" }
        })

        const lastEvent = await prisma.agent_events.findFirst({
            where: { agent_id: agent.agent_id },
            orderBy: { created_at: 'desc' }
        })

        return {
            ...agent,
            status: activeStep ? "running" : "idle",
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
                <h2 className="text-3xl font-bold tracking-tight text-white">Agents</h2>
            </div>

            {/* Summary Bar */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Agents</CardTitle>
                        <UsersIcon className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{agents.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Avg Trust Score</CardTitle>
                        <Trophy className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{avgTrust.toFixed(1)}%</div>
                        <Progress value={avgTrust} className="mt-2 h-1" />
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Tasks</CardTitle>
                        <Zap className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{totalTasks}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Agents Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <Table>
                    <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Agent</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Trust Score</TableHead>
                            <TableHead className="text-zinc-400">Tasks</TableHead>
                            <TableHead className="text-zinc-400">Last Active</TableHead>
                            <TableHead className="text-right text-zinc-400">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrichedAgents.map((agent: any) => (
                            <TableRow key={agent.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border border-zinc-700">
                                            <AvatarImage src={`/agents/${agent.agent_id}.png`} />
                                            <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span>{agent.name}</span>
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
                                            'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }>
                                        {agent.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={agent.trust_percent} className="w-[60px] h-2" />
                                        <span className="text-xs text-zinc-400">{agent.trust_percent.toFixed(0)}%</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs text-zinc-400">
                                        <span className="text-white">{agent.successful_tasks} / {agent.total_tasks}</span>
                                        <span>{agent.total_tasks ? ((agent.successful_tasks! / agent.total_tasks) * 100).toFixed(0) : 0}% success</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-zinc-400 text-sm">
                                    {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/agents/${agent.agent_id}`}>
                                            <ArrowRight className="h-6 w-6" />
                                        </Link>
                                    </Button>
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
