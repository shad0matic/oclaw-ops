"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { DollarSign, TrendingUp, PlusCircle, Edit, Trash2, Mic, Clock } from "lucide-react"
import { SubscriptionForm } from "./subscription-form"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function CostsClientPage() {
    const { data: subscriptions, error, mutate } = useSWR('/api/costs/subscriptions', fetcher, { refreshInterval: 30000 })
    const { data: snapshots } = useSWR('/api/costs/snapshots', fetcher, { refreshInterval: 30000 })
    const { data: xaiBalance } = useSWR('/api/costs/xai-balance', fetcher, { refreshInterval: 30000 })
    const { data: apiUsage } = useSWR('/api/costs/api-usage?days=30', fetcher, { refreshInterval: 30000 })

    const [isAdding, setIsAdding] = useState(false)
    const [editingSub, setEditingSub] = useState<any>(null)

    const totalMonthlyFixed = subscriptions?.filter((s: any) => s.active).reduce((sum: number, sub: any) => sum + Number(sub.monthly_price), 0) || 0
    const openClawMonthly = subscriptions?.filter((s: any) => s.active && s.used_in_openclaw).reduce((sum: number, sub: any) => sum + Number(sub.monthly_price), 0) || 0

    const handleArchive = async (id: number) => {
        await fetch(`/api/costs/subscriptions?id=${id}`, { method: 'DELETE' })
        mutate()
    }

    const handleToggleActive = async (id: number, active: boolean) => {
        await fetch(`/api/costs/subscriptions?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active })
        })
        mutate()
    }
    
    const onFormFinished = () => {
        setIsAdding(false)
        setEditingSub(null)
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total Monthly Fixed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                            €{totalMonthlyFixed.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            OpenClaw-only Monthly
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                            €{openClawMonthly.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            xAI Metered Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                            ${xaiBalance?.balance_usd?.toFixed(2) || '0.00'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Mic className="h-4 w-4" />
                            API Usage (30d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                            ${apiUsage?.totals?.total_cost_usd ? Number(apiUsage.totals.total_cost_usd).toFixed(2) : '0.00'}
                        </div>
                        {apiUsage?.totals?.total_whisper_minutes && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {Number(apiUsage.totals.total_whisper_minutes).toFixed(0)} min transcribed
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card className="bg-card/50 border-border">
                <CardHeader>
                    <CardTitle>Billing Models</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Anthropic</Badge>
                    <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">OpenAI OAuth</Badge>
                    <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Google</Badge>
                    <Badge variant="default" className="bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30">xAI</Badge>
                    <Badge variant="default" className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30">OpenAI API Key (unused)</Badge>
                </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mic className="h-5 w-5" />
                        Pay-Per-Use API Calls
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
        </div>
    )
}
