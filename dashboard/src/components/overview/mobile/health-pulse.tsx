"use client"

import { AgentStatusDot } from "../shared/agent-status-dot"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"

export interface HealthPulseProps {
  status: 'online' | 'offline' | 'degraded'
  activeCount: number
  dailyCost: number
  cpu?: number
  memory?: number
  load?: number[]
  onClick?: () => void
}

export function HealthPulse({ status, activeCount, dailyCost, cpu, memory, load, onClick }: HealthPulseProps) {
  const loadStr = load?.[0]?.toFixed(1)
  const memPct = memory ?? 0
  const cpuPct = cpu ?? 0

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border backdrop-blur-sm transition-colors",
        status === 'online' && "bg-card/95",
        status === 'degraded' && "bg-yellow-500/10 dark:bg-yellow-500/20",
        status === 'offline' && "bg-red-500/10 dark:bg-red-500/20"
      )}
    >
      {/* Row 1: status + agents + cost */}
      <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-sm">
        <AgentStatusDot
          status={status === 'online' ? 'active' : status === 'offline' ? 'error' : 'warning'}
          withPulse={status === 'online'}
        />
        <span className="text-foreground font-medium">
          {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Degraded'}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{activeCount} active</span>
        <span className="text-muted-foreground">·</span>
        <CostDisplay cost={dailyCost} className="text-sm" />
      </div>
      {/* Row 2: system metrics bar */}
      {(load || cpu !== undefined || memory !== undefined) && (
        <div className="flex items-center justify-center gap-4 px-4 pb-1.5 text-[11px] text-muted-foreground">
          {loadStr && (
            <span className={cn(Number(loadStr) > 2 ? "text-amber-400" : "")}>
              ⚡ Load {loadStr}
            </span>
          )}
          {cpu !== undefined && (
            <span className={cn(cpuPct > 80 ? "text-red-400" : cpuPct > 50 ? "text-amber-400" : "")}>
              CPU {cpuPct}%
            </span>
          )}
          {memory !== undefined && (
            <span className={cn(memPct > 80 ? "text-red-400" : memPct > 60 ? "text-amber-400" : "")}>
              RAM {memPct}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
