"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Limit {
  type: string
  current: number
  limit: number
  percentage: number
  window: string
  note?: string
  status: 'ok' | 'warning' | 'critical'
}

interface Quota {
  provider: string
  name: string
  limits: Limit[]
}

export function DaveQuotas() {
  const { data, error } = useSWR('/api/dave/quotas', fetcher, { refreshInterval: 10000 })

  if (error) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Failed to load quotas</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading quotas...</p>
        </CardContent>
      </Card>
    )
  }

  const quotas: Quota[] = data.quotas || []

  return (
    <div className="space-y-4">
      {quotas.map((quota) => (
        <Card key={quota.provider} className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base">{quota.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quota.limits.map((limit, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{limit.type}</span>
                    {limit.status === 'ok' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                    {limit.status === 'warning' && <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />}
                    {limit.status === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {formatNumber(limit.current)} / {formatNumber(limit.limit)}
                  </span>
                </div>
                
                <Progress 
                  value={Math.min(limit.percentage, 100)} 
                  className={`h-2 ${getProgressColor(limit.status)}`}
                />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{limit.percentage}% used ({limit.window})</span>
                  {limit.note && <span className="italic">{limit.note}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`
  }
  return num.toString()
}

function getProgressColor(status: 'ok' | 'warning' | 'critical'): string {
  switch (status) {
    case 'critical': return '[&>div]:bg-red-500'
    case 'warning': return '[&>div]:bg-yellow-500'
    case 'ok': return '[&>div]:bg-green-500'
  }
}
