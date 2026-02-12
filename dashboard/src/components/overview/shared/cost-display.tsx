"use client"

import { cn } from "@/lib/utils"

export interface CostDisplayProps {
  cost: number
  threshold?: {
    warning: number
    error: number
  }
  prefix?: string
  className?: string
}

export function CostDisplay({ cost, threshold, prefix = "€", className }: CostDisplayProps) {
  const getColorClass = () => {
    if (!threshold) return "text-foreground"
    if (cost >= threshold.error) return "text-red-600 dark:text-red-400"
    if (cost >= threshold.warning) return "text-yellow-600 dark:text-yellow-400"
    return "text-foreground"
  }

  return (
    <span className={cn("font-medium tabular-nums", getColorClass(), className)}>
      {prefix}{cost.toFixed(2)}
    </span>
  )
}
