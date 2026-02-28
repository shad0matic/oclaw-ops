"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`
  }
  return count.toString()
}

export function DaveCostCharts() {
  const { data: providerData } = useSWR('/api/dave/costs?view=byProvider', fetcher, { refreshInterval: 30000 })

  return (
    <div className="grid gap-4">
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Token Usage by Provider (This Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {providerData?.byProvider && providerData.byProvider.length > 0 ? (
            <div className="space-y-3">
              {providerData.byProvider.map((provider: any, i: number) => (
                <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="font-medium text-sm mb-1">{provider.provider}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span className="font-mono text-foreground">
                        {formatTokens(provider.inputTokens)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output: </span>
                      <span className="font-mono text-foreground">
                        {formatTokens(provider.outputTokens)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cached: </span>
                      <span className="font-mono text-foreground">
                        {formatTokens(provider.cachedTokens)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No provider data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
