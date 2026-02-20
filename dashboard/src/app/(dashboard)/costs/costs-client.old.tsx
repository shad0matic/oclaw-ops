"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    DollarSign, TrendingUp, PlusCircle, Edit, Trash2, Mic, Clock, 
    CreditCard, Zap, Calendar, ArrowUpRight, ArrowDownRight 
} from "lucide-react"
import { SubscriptionForm } from "./subscription-form"
import { CostByModelChart, CostByAgentChart, DailyCostTrendChart } from "@/components/costs/cost-charts"
import { BudgetManager } from "@/components/costs/budget-manager"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function CostsClientPage() {
    const { data: subscriptions, mutate: mutateSubscriptions } = useSWR('/api/costs/subscriptions', fetcher, { refreshInterval: 30000 })
    const { data: xaiBalance } = useSWR('/api/costs/xai-balance', fetcher, { refreshInterval: 30000 })
    const { data: apiUsage } = useSWR('/api/costs/api-usage?days=30', fetcher, { refreshInterval: 30000 })
    const { data: costSummary } = useSWR('/api/costs/summary?days=30', fetcher, { refreshInterval: 30000 })

    const [isAdding, setIsAdding] = useState(false)
    const [editingSub, setEditingSub] = useState<any>(null)

    const totalMonthlyFixed = subscriptions?.filter((s: any) => s.active).reduce((sum: number, sub: any) => sum + Number(sub.monthly_price), 0) || 0
    const openClawMonthly = subscriptions?.filter((s: any) => s.active && s.used_in_openclaw).reduce((sum: number, sub: any) => sum + Number(sub.monthly_price), 0) || 0

    const handleArchive = async (id: number) => {
        await fetch(`/api/costs/subscriptions?id=${id}`, { method: 'DELETE' })
        mutateSubscriptions()
    }

    const handleToggleActive = async (id: number, active: boolean) => {
        await fetch(`/api/costs/subscriptions?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active })
        })
        mutateSubscriptions()
    }
    
    const onFormFinished = () => {
        setIsAdding(false)
        setEditingSub(null)
    }

    // Calculate change percentages
    const todayCost = costSummary?.todayTotals?.costUsd || 0
    const yesterdayCost = costSummary?.yesterdayTotals?.costUsd || 0
    const dayChange = yesterdayCost > 0 ? ((todayCost - yesterdayCost) / yesterdayCost) * 100 : 0

    return (
        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="api-usage">API Usage</TabsTrigger>
                <TabsTrigger value="budgets">Budgets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-card/50 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                AI Costs (MTD)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                                ${costSummary?.monthTotals?.costUsd?.toFixed(2) || '0.00'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {costSummary?.monthTotals?.runCount?.toLocaleString() || 0} runs
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Subscriptions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                                €{totalMonthlyFixed.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                OpenClaw: €{openClawMonthly.toFixed(2)}/mo
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-foreground">
                                    ${todayCost.toFixed(2)}
                                </span>
                                {dayChange !== 0 && (
                                    <span className={`text-sm flex items-center ${dayChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {dayChange > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        {Math.abs(dayChange).toFixed(0)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                vs yesterday: ${yesterdayCost.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                xAI Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                                ${xaiBalance?.balance_usd?.toFixed(2) || '0.00'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Metered usage
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <DailyCostTrendChart data={costSummary?.dailyTrend || []} />
                    <CostByModelChart data={costSummary?.byModel || []} />
                    <CostByAgentChart data={costSummary?.byAgent || []} />
                </div>

                {/* Billing Models */}
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm">Billing Models</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Anthropic (Free Tier)</Badge>
                        <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">OpenAI OAuth</Badge>
                        <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Google</Badge>
                        <Badge variant="default" className="bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30">xAI (Metered)</Badge>
                        <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30">OpenRouter (Metered)</Badge>
                    </CardContent>
                </Card>

                {/* Top Expensive Tasks */}
                {costSummary?.expensiveTasks?.length > 0 && (
                    <Card className="bg-card/50 border-border">
                        <CardHeader>
                            <CardTitle className="text-sm">Most Expensive Tasks (This Month)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {costSummary.expensiveTasks.map((task: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-foreground truncate">{task.description || `Task ${task.taskId}`}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{task.agent}</Badge>
                                                <span>{task.model}</span>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <div className="font-mono text-foreground">${task.costUsd.toFixed(4)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {(task.inputTokens + task.outputTokens).toLocaleString()} tokens
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-6">
                <Card className="bg-card/50 border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Subscription Manager</CardTitle>
                        <Button size="sm" onClick={() => { setIsAdding(true); setEditingSub(null) }}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Subscription
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {(isAdding || editingSub) && (
                            <SubscriptionForm subscription={editingSub} onFinished={onFormFinished} />
                        )}
                        <div className="space-y-3">
                            {subscriptions?.map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-4">
                                        <Switch checked={sub.active} onCheckedChange={(val) => handleToggleActive(sub.id, val)} />
                                        <div>
                                            <div className="font-medium text-foreground">{sub.name}</div>
                                            <div className="text-xs text-muted-foreground/70">{sub.provider}</div>
                                        </div>
                                        {sub.used_in_openclaw && <Badge variant="outline">OpenClaw</Badge>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-mono text-foreground">
                                                {sub.currency === 'USD' ? '$' : '€'}{Number(sub.monthly_price).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-muted-foreground/70">/month</div>
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingSub(sub); setIsAdding(false) }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleArchive(sub.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="api-usage" className="space-y-6">
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mic className="h-5 w-5" />
                            Pay-Per-Use API Calls (Last 30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Summary by service */}
                        {apiUsage?.summary?.length > 0 && (
                            <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {apiUsage.summary.map((item: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg bg-background/50 border border-border">
                                        <div className="font-medium text-foreground">{item.service}</div>
                                        <div className="text-xs text-muted-foreground">{item.model}</div>
                                        <div className="mt-2 flex justify-between">
                                            <span className="text-sm text-muted-foreground">{Number(item.call_count)} calls</span>
                                            <span className="font-mono text-foreground">${Number(item.total_cost_usd).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-3">
                            {apiUsage?.recent?.length === 0 && (
                                <div className="text-muted-foreground text-sm">No API usage recorded yet</div>
                            )}
                            {apiUsage?.recent?.map((usage: any) => (
                                <div key={usage.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-600/20">
                                            <Mic className="h-4 w-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{usage.service}</div>
                                            <div className="text-xs text-muted-foreground/70 flex items-center gap-2">
                                                <span>{usage.model}</span>
                                                {usage.agent_id && <Badge variant="outline" className="text-xs">{usage.agent_id}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-foreground">${Number(usage.cost_usd).toFixed(4)}</div>
                                        <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {Number(usage.units).toFixed(0)} {usage.unit_type}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="budgets" className="space-y-6">
                <BudgetManager />
            </TabsContent>
        </Tabs>
    )
}
