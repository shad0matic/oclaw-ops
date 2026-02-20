"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function DaveCostCharts() {
  const { data: monthData } = useSWR('/api/dave/costs?view=month', fetcher, { refreshInterval: 30000 })
  const { data: todayData } = useSWR('/api/dave/costs?view=today', fetcher, { refreshInterval: 10000 })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="font-mono text-sm text-foreground">
                ${(Number(todayData?.totalUsd) || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-mono text-sm text-foreground">
                ${(Number(monthData?.totalUsd) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm">Top Agents (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          {monthData?.byAgent && monthData.byAgent.length > 0 ? (
            <div className="space-y-2">
              {monthData.byAgent.slice(0, 5).map((agent: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{agent.agentId}</span>
                  <span className="font-mono text-sm text-foreground">
                    ${(Number(agent.costUsd) || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No agent data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
