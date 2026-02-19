"use client"

import { cn } from "@/lib/utils"

interface MiniGaugeProps {
  value: number       // 0-100 for percentage, raw value otherwise
  label: string       // "CPU" or "RAM"
  className?: string
  type?: 'percentage' | 'raw'
  max?: number        // max value for raw type
}

export function MiniGauge({ value, label, className, type = 'percentage', max = 1 }: MiniGaugeProps) {
  const percentage = type === 'percentage' ? value : (value / max) * 100
  const displayValue = type === 'percentage' ? `${Math.round(value)}%` : value.toFixed(2)
  const clamped = Math.min(100, Math.max(0, percentage))
  
  // Color based on value
  const barColor = clamped > 90
    ? "bg-red-500"
    : clamped > 70
    ? "bg-orange-500"
    : "bg-green-500"

  return (
    <div className={cn("flex flex-col gap-0.5 min-w-[60px]", className)}>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-medium tabular-nums">{displayValue}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
