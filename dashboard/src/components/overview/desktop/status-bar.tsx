"use client"

import { AgentStatusDot } from "../shared/agent-status-dot"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"

export interface StatusBarProps {
  status: 'online' | 'offline' | 'degraded'
  uptime: number
  cpu: number
  memory: number
  activeCount: number
  dailyCost: number
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

export function StatusBar({
  status,
  uptime,
  cpu,
  memory,
  activeCount,
  dailyCost
}: StatusBarProps) {
  const statusText = status === 'online' ? `Online · ${formatUptime(uptime)}` : status

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`System ${status}. ${activeCount} tasks active. Today's cost: ${dailyCost.toFixed(2)} euros. CPU: ${cpu}%, Memory: ${memory}%`}
      className="flex items-center gap-6 border-b border-border bg-card px-6 py-3"
    >
      {/* System Status */}
      <div className="flex items-center gap-2">
        <AgentStatusDot
          status={status === 'online' ? 'active' : status === 'offline' ? 'error' : 'warning'}
          withPulse={status === 'online'}
        />
        <span className="text-sm text-foreground">
          {statusText}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border" aria-hidden="true" />

      {/* Active Count */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground font-medium">{activeCount}</span>
        <span className="text-sm text-muted-foreground">active</span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border" aria-hidden="true" />

      {/* Daily Cost */}
      <div className="flex items-center gap-2">
        <CostDisplay cost={dailyCost} className="text-sm" />
        <span className="text-sm text-muted-foreground">today</span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border" aria-hidden="true" />

      {/* System Resources */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-foreground font-medium">{cpu.toFixed(1)}%</span>
          <span>CPU</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-foreground font-medium">{memory}%</span>
          <span>Mem</span>
        </div>
      </div>
    </div>
  )
}
