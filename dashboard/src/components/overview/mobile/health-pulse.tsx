"use client"

import { AgentStatusDot } from "../shared/agent-status-dot"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"

export interface HealthPulseProps {
  status: 'online' | 'offline' | 'degraded'
  activeCount: number
  dailyCost: number
  onClick?: () => void
}

export function HealthPulse({ status, activeCount, dailyCost, onClick }: HealthPulseProps) {
  const statusText = status === 'online' ? 'All systems go' : status === 'offline' ? 'System offline' : 'System degraded'

  return (
    <button
      role="status"
      aria-live="polite"
      aria-label={`System ${status}. ${activeCount} active. Cost: ${dailyCost.toFixed(2)} euros`}
      onClick={onClick}
      className={cn(
        "sticky top-0 z-40 w-full px-4 py-2 text-sm",
        "flex items-center justify-center gap-2",
        "border-b border-border backdrop-blur-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "transition-colors",
        status === 'online' && "bg-card/95",
        status === 'degraded' && "bg-yellow-500/10 dark:bg-yellow-500/20",
        status === 'offline' && "bg-red-500/10 dark:bg-red-500/20"
      )}
    >
      <AgentStatusDot
        status={status === 'online' ? 'active' : status === 'offline' ? 'error' : 'warning'}
        withPulse={status === 'online'}
      />
      <span className="text-foreground font-medium">{statusText}</span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <span className="text-muted-foreground">{activeCount} active</span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <CostDisplay cost={dailyCost} className="text-sm" />
    </button>
  )
}
