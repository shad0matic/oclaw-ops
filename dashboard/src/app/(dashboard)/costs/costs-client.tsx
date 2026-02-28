"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, TrendingUp, AlertTriangle, Target, Calendar, 
  ArrowUpRight, ArrowDownRight, Zap, CreditCard, PauseCircle, PlayCircle
} from "lucide-react"
import { DaveBudgetManager } from "@/components/dave/dave-budget-manager"
import { DaveCostCharts } from "@/components/dave/dave-cost-charts"
import { DaveQuotas } from "@/components/dave/dave-quotas"

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Safe number formatting helper
const fmt = (val: any, decimals = 2): string => {
  const num = Number(val)
  return isNaN(num) ? '0.00' : num.toFixed(decimals)
}

export default function CostsClientPage() {
  const { data: summary } = useSWR('/api/dave/summary', fetcher, { refreshInterval: 10000 })
  const { data: subscriptions } = useSWR('/api/costs/subscriptions', fetcher, { refreshInterval: 30000 })
  const { data: xaiBalance } = useSWR('/api/costs/xai-balance', fetcher, { refreshInterval: 30000 })

  const totalMonthlySubscriptions = Array.isArray(subscriptions) 
    ? subscriptions.filter((s: any) => s.active)
        .reduce((sum: number, sub: any) => sum + (Number(sub.monthly_price) || 0), 0)
    : 0

  const todaySpend = Number(summary?.today?.totalUsd) || 0
  const weekSpend = Number(summary?.week?.totalUsd) || 0
  const monthSpend = Number(summary?.month?.totalUsd) || 0

  // Calculate combined totals (AI + subscriptions)
  const monthlyBudgetTotal = (monthSpend || 0) + (totalMonthlySubscriptions || 0)

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="agents">Agent Budgets</TabsTrigger>
        <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        <TabsTrigger value="alerts">
          Alerts
          {summary?.alerts && summary.alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">{summary.alerts.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${fmt(todaySpend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.today?.byAgent?.length || 0} agents active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${fmt(weekSpend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tier 3: ${fmt(((summary?.week?.byTier?.tier3 || 0) / 100))}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                This Month (AI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${fmt(monthSpend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Metered API usage
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
                ${fmt(totalMonthlySubscriptions)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                /month fixed costs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {summary?.alerts && summary.alerts.length > 0 && (
          <Card className="bg-card/50 border-yellow-500/20 border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Budget Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.alerts.map((alert: any, i: number) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg border ${
                      alert.level === 'critical' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          {alert.agentId} — {alert.type} budget
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${fmt((alert.spentCents / 100))} / ${fmt((alert.limitCents / 100))}
                          {' '}({fmt(alert.percentUsed, 1)}% used)
                        </div>
                      </div>
                      <Badge variant={alert.level === 'critical' ? 'destructive' : 'outline'}>
                        {alert.level === 'critical' ? 'OVER BUDGET' : 'WARNING'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paused Agents */}
        {summary?.pausedAgents && summary.pausedAgents.length > 0 && (
          <Card className="bg-card/50 border-red-500/20 border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PauseCircle className="h-5 w-5 text-red-500" />
                Paused Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.pausedAgents.map((agent: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div>
                      <div className="font-medium text-foreground">{agent.agentId}</div>
                      <div className="text-sm text-muted-foreground">{agent.reason}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(agent.pausedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent Spend Breakdown */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-sm">Today's Spend by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.today?.byAgent?.map((agent: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{agent.agentId}</div>
                    <div className="text-xs text-muted-foreground">{agent.callCount} API calls</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-foreground">${fmt(agent.costUsd)}</div>
                  </div>
                </div>
              ))}
              {(!summary?.today?.byAgent || summary.today.byAgent.length === 0) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No agent activity today
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Trend Charts */}
        <DaveCostCharts />

        {/* Provider Rate Limits */}
        <DaveQuotas />

        {/* Cost Tier Breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tier 1 (Cheap)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ${fmt(((summary?.month?.byTier?.tier1 || 0) / 100))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">MiniMax, Haiku, GPT-4o-mini</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tier 2 (Mid)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                ${fmt(((summary?.month?.byTier?.tier2 || 0) / 100))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sonnet, GPT-4o, Gemini</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tier 3 (Expensive)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                ${fmt(((summary?.month?.byTier?.tier3 || 0) / 100))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Opus, GPT-4 Turbo</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Monthly Projection */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-sm">Monthly Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Metered API (MTD)</span>
                <span className="font-mono text-foreground">${fmt(monthSpend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subscriptions (Monthly)</span>
                <span className="font-mono text-foreground">${fmt(totalMonthlySubscriptions)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">xAI Balance Remaining</span>
                <span className="font-mono text-green-400">${typeof xaiBalance?.balance_usd === 'number' ? fmt(xaiBalance.balance_usd) : '—'}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Monthly Spend</span>
                  <span className="font-mono text-foreground text-lg">${fmt(monthlyBudgetTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agents" className="space-y-6">
        <DaveBudgetManager />
      </TabsContent>

      <TabsContent value="subscriptions" className="space-y-6">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Monthly Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions?.filter((s: any) => s.active).map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                  <div>
                    <div className="font-medium text-foreground">{sub.name}</div>
                    <div className="text-xs text-muted-foreground/70">{sub.provider}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-foreground">
                      {sub.currency === 'USD' ? '$' : '€'}{fmt(sub.monthly_price)}
                    </div>
                    <div className="text-xs text-muted-foreground/70">/month</div>
                  </div>
                </div>
              ))}
              {(!subscriptions || subscriptions.filter((s: any) => s.active).length === 0) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No active subscriptions
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Monthly Subscriptions</span>
                <span className="font-mono">${fmt(totalMonthlySubscriptions)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="alerts" className="space-y-6">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Budget Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.alerts && summary.alerts.length > 0 ? (
              <div className="space-y-4">
                {summary.alerts.map((alert: any, i: number) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-lg border ${
                      alert.level === 'critical' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={alert.level === 'critical' ? 'destructive' : 'outline'}>
                            {alert.level.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-foreground">{alert.agentId}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} budget limit approaching</div>
                          <div className="mt-1">
                            Spent: ${fmt((alert.spentCents / 100))} / ${fmt((alert.limitCents / 100))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {fmt(alert.percentUsed, 0)}%
                        </div>
                        <Progress 
                          value={Math.min(100, alert.percentUsed)} 
                          className="mt-2 w-24 h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No budget alerts</p>
                <p className="text-sm mt-1">All agents are within budget limits</p>
              </div>
            )}
          </CardContent>
        </Card>

        {summary?.pausedAgents && summary.pausedAgents.length > 0 && (
          <Card className="bg-card/50 border-red-500/20 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PauseCircle className="h-5 w-5 text-red-500" />
                Paused Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.pausedAgents.map((agent: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-foreground text-lg">{agent.agentId}</div>
                      <Badge variant="destructive">PAUSED</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{agent.reason}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Paused at: {new Date(agent.pausedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
