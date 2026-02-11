import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ArrowLeft, Star, ThumbsUp, Calendar, Activity, Info } from "lucide-react"
import Link from "next/link"
import { AgentActions } from "@/components/agents/agent-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getAgentName } from "@/lib/agent-names"

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) redirect("/login")

    const { id } = await params

    const agent = await prisma.agent_profiles.findUnique({
        where: { agent_id: id }
    })

    if (!agent) {
        return <div className="p-8 text-white">Agent not found</div>
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [events, reviews, todayEvents] = await Promise.all([
        prisma.agent_events.findMany({
            where: { agent_id: id },
            orderBy: { created_at: 'desc' },
            take: 50
        }),
        prisma.performance_reviews.findMany({
            where: { agent_id: id },
            orderBy: { created_at: 'desc' },
        }),
        prisma.agent_events.count({
            where: { agent_id: id, created_at: { gte: todayStart } }
        }),
    ])

    const serializedEvents = events.map((e: any) => ({
        ...e,
        id: Number(e.id),
        created_at: e.created_at?.toISOString() || new Date().toISOString(),
        cost_usd: Number(e.cost_usd),
    }))

    const totalTasks = agent.total_tasks || 0
    const successfulTasks = agent.successful_tasks || 0
    const successRate = totalTasks > 0 ? Math.round((successfulTasks / totalTasks) * 100) : 0

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/agents"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-zinc-700">
                        <AvatarImage src={`/assets/minion-avatars/${id}.webp`} />
                        <AvatarImage src="/assets/minion-avatars/default.webp" />
                        <AvatarFallback className="text-xl">{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">{agent.name}</h2>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <span className="flex items-center gap-1">
                                <img src={`/assets/rank-icons/rank-${Math.min(agent.level ?? 1, 10)}.webp`} alt={`Rank ${agent.level}`} className="h-10 w-10" />
                                <span className="text-amber-500 text-sm">Level {agent.level}</span>
                            </span>
                            <span>•</span>
                            <span>Joined {agent.created_at?.toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="ml-auto">
                    <AgentActions
                        agentId={id}
                        agentName={agent.name}
                        currentLevel={agent.level || 1}
                    />
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    <TabsTrigger value="config">Config</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Trust Score */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-help">
                                            <CardTitle className="text-sm font-medium text-zinc-400">Trust Score</CardTitle>
                                            <Star className="h-4 w-4 text-amber-500" />
                                        </CardHeader>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm p-3" side="bottom">
                                        <div className="space-y-2">
                                            {[
                                                { rank: 1, name: 'Rookie', range: '0-10%' },
                                                { rank: 2, name: 'Watcher', range: '11-20%' },
                                                { rank: 3, name: 'Helper', range: '21-30%' },
                                                { rank: 4, name: 'Builder', range: '31-40%' },
                                                { rank: 5, name: 'Operator', range: '41-50%' },
                                                { rank: 6, name: 'Specialist', range: '51-60%' },
                                                { rank: 7, name: 'Pioneer', range: '61-70%' },
                                                { rank: 8, name: 'Commander', range: '71-80%' },
                                                { rank: 9, name: 'Champion', range: '81-90%' },
                                                { rank: 10, name: 'Master', range: '91-100%' },
                                            ].map((r) => (
                                                <div key={r.rank} className={`flex items-center gap-2 text-sm ${r.rank === (agent.level ?? 1) ? 'text-amber-400 font-semibold' : ''}`}>
                                                    <img src={`/assets/rank-icons/rank-${r.rank}.webp`} className="h-5 w-5" alt="" />
                                                    <span className="flex-1">{r.name}</span>
                                                    <span className="text-zinc-500 text-xs">{r.range}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Based on task success, error rate, and manual overrides.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-white">{Math.round(Number(agent.trust_score) * 100)}%</div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-zinc-500 hover:text-zinc-300 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs p-3" side="right">
                                                <p className="font-semibold text-sm mb-1">How promotion works</p>
                                                <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-3">
                                                    <li>Trust score grows with successful tasks and shrinks with errors</li>
                                                    <li>Boss can manually promote/demote via the agent actions menu (⋮)</li>
                                                    <li>Higher ranks unlock more autonomy — fewer &quot;ask first&quot; checkpoints</li>
                                                    <li>Rank X (Master) agents can act fully autonomously on approved task types</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <Progress value={Number(agent.trust_score) * 100} className="mt-2 h-1" />
                            </CardContent>
                        </Card>

                        {/* Task Success */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Task Success</CardTitle>
                                <ThumbsUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{successRate}%</div>
                                <p className="text-xs text-zinc-500">{successfulTasks} / {totalTasks} tasks</p>
                            </CardContent>
                        </Card>

                        {/* Today's Activity */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Today</CardTitle>
                                <Calendar className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{todayEvents}</div>
                                <p className="text-xs text-zinc-500">events today</p>
                            </CardContent>
                        </Card>

                        {/* Total Events */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Total Events</CardTitle>
                                <Activity className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{events.length}</div>
                                <p className="text-xs text-zinc-500">all time</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity — directly, no nested card */}
                    <ActivityFeed events={serializedEvents.slice(0, 10)} />
                </TabsContent>

                <TabsContent value="activity">
                    <ActivityFeed events={serializedEvents} />
                </TabsContent>

                <TabsContent value="reviews">
                    {reviews.length === 0 ? (
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardContent className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                                No reviews yet
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {reviews.map((review: any) => (
                                <Card key={review.id} className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg text-white">Review by {review.reviewer}</CardTitle>
                                            <span className="text-zinc-500 text-sm">{review.created_at?.toLocaleDateString()}</span>
                                        </div>
                                        <CardDescription>
                                            Level {review.level_before} → Level {review.level_after}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} className={`h-4 w-4 ${i < (review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'}`} />
                                            ))}
                                        </div>
                                        <p className="text-zinc-300">{review.output_summary}</p>
                                        <p className="text-zinc-400 italic">&quot;{review.feedback}&quot;</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="config">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle>Agent Configuration</CardTitle>
                            <CardDescription>Read-only view of the agent&apos;s settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Agent ID</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800 font-mono text-sm">{agent.agent_id}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Display Name</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">{agent.name}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Level</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800 flex items-center gap-2">
                                        <img src={`/assets/rank-icons/rank-${Math.min(agent.level ?? 1, 10)}.webp`} className="h-6 w-6" alt="" />
                                        Level {agent.level}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Trust Score</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">{Math.round(Number(agent.trust_score) * 100)}%</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Created</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">{agent.created_at?.toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Last Updated</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">{agent.updated_at?.toLocaleDateString()}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
