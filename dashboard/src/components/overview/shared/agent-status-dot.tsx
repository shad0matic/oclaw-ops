"use client"

import { cn } from "@/lib/utils"

export interface AgentStatusDotProps {
  status: 'active' | 'idle' | 'error' | 'warning' | 'zombie'
  withPulse?: boolean
  className?: string
}

export function AgentStatusDot({ status, withPulse = false, className }: AgentStatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === 'active' && "bg-green-500",
        status === 'idle' && "bg-zinc-400 dark:bg-zinc-600",
        status === 'error' && "bg-red-500",
        status === 'warning' && "bg-yellow-500",
        status === 'zombie' && "bg-red-500",
        withPulse && status === 'active' && "motion-safe:animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  )
}
