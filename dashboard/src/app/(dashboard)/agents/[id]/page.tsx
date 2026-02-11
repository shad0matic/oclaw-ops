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
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, User, Activity, Settings, FileText } from "lucide-react"
import Link from "next/link"
import { AgentActions } from "@/components/agents/agent-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

    const [events, reviews, stats] = await Promise.all([
        prisma.agent_events.findMany({
            where: { agent_id: id },
            orderBy: { created_at: 'desc' },
            take: 50
        }),
        prisma.performance_reviews.findMany({
            where: { agent_id: id },
            orderBy: { created_at: 'desc' },
        }),
        prisma.steps.aggregate({
            where: { agent_id: id },
            _count: { _all: true },
            _avg: { retries: true } // Mocking some stats
        })
    ])

    const serializedEvents = events.map((e: any) => ({
        ...e,
        id: Number(e.id),
        created_at: e.created_at?.toISOString() || new Date().toISOString(),
        cost_usd: Number(e.cost_usd),
    }))

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/agents"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-zinc-700">
                        <AvatarImage src={`/assets/minion-avatars/${id}.webp`} />
                        <AvatarFallback className="text-xl">{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">{agent.name}</h2>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Badge variant="outline" className="border-amber-500/20 text-amber-500">
                                Level {agent.level}
                            </Badge>
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
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-help">
                                            <CardTitle className="text-sm font-medium text-zinc-400">Trust Score</CardTitle>
                                            <Star className="h-4 w-4 text-amber-500" />
                                        </CardHeader>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">L1 👁️ (0-25%): Observer</p>
                                        <p className="text-sm">L2 💡 (26-50%): Contributor</p>
                                        <p className="text-sm">L3 ⚙️ (51-75%): Operator</p>
                                        <p className="text-sm">L4 🚀 (76-100%): Autonomous</p>
                                        <p className="text-xs text-muted-foreground mt-2">Based on task success, error frequency, and manual overrides.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{Math.round(Number(agent.trust_score) * 100)}%</div>
                                <Progress value={Number(agent.trust_score) * 100} className="mt-2 h-1" />
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Task Success</CardTitle>
                                <ThumbsUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    {agent.total_tasks && agent.total_tasks > 0
                                        ? ((agent.successful_tasks! / agent.total_tasks) * 100).toFixed(0)
                                        : 0}%
                                </div>
                                <p className="text-xs text-zinc-500">{agent.successful_tasks} / {agent.total_tasks} tasks</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Avg Retries</CardTitle>
                                <Activity className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats._avg.retries?.toFixed(2) || 0}</div>
                                <p className="text-xs text-zinc-500">Per step</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4 bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ActivityFeed events={serializedEvents.slice(0, 5)} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="activity">
                    <ActivityFeed events={serializedEvents} />
                </TabsContent>

                <TabsContent value="reviews">
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
                                    <p className="text-zinc-400 italic">"{review.feedback}"</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="config">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle>Agent Configuration</CardTitle>
                            <CardDescription>Read-only view of the agent's settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Agent ID</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">{agent.agent_id}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Model</label>
                                    <div className="text-white p-2 bg-zinc-950 rounded border border-zinc-800">claude-3-5-sonnet</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
