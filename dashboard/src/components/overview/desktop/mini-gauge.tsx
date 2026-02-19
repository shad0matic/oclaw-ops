"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MiniGaugeProps {
  value: number       // 0-100 for percentage, raw value otherwise
  label: string       // "CPU" or "RAM"
  detail?: string     // e.g. "18GB/22GB" — shown on hover
  size?: number       // diameter in px
  className?: string
  type?: 'percentage' | 'raw'
  max?: number        // max value for raw type
}

export function MiniGauge({ value, label, detail, size = 48, className, type = 'percentage', max = 1 }: MiniGaugeProps) {
  const displayValue = type === 'percentage' ? `${Math.round(value)}%` : value.toFixed(2)
  const percentage = type === 'percentage' ? value : (value / max) * 100
  const clamped = Math.min(100, Math.max(0, percentage))
  
  // Semi-circle arc from 180° to 0° (left to right, bottom half)
  const radius = (size - 8) / 2  // larger radius to wrap around text
  const cx = size / 2
  const cy = radius + 4  // center vertically with small top padding
  const startAngle = Math.PI      // 180° (left)
  const endAngle = 0              // 0° (right)
  const sweepAngle = startAngle - (startAngle - endAngle) * (clamped / 100)

  // Background arc (full semi-circle)
  const bgX1 = cx + radius * Math.cos(startAngle)
  const bgY1 = cy - radius * Math.sin(startAngle)
  const bgX2 = cx + radius * Math.cos(endAngle)
  const bgY2 = cy - radius * Math.sin(endAngle)
  const bgPath = `M ${bgX1} ${bgY1} A ${radius} ${radius} 0 1 1 ${bgX2} ${bgY2}`

  // Value arc
  const valX1 = cx + radius * Math.cos(startAngle)
  const valY1 = cy - radius * Math.sin(startAngle)
  const valX2 = cx + radius * Math.cos(sweepAngle)
  const valY2 = cy - radius * Math.sin(sweepAngle)
  const largeArc = clamped > 50 ? 1 : 0
  const valPath = `M ${valX1} ${valY1} A ${radius} ${radius} 0 ${largeArc} 1 ${valX2} ${valY2}`

  // Color based on value
  const color = clamped > 90
    ? "stroke-red-500"
    : clamped > 70
    ? "stroke-orange-500"
    : "stroke-green-500"

  // Calculate exact SVG dimensions to prevent clipping
  const svgHeight = cy + 4  // cy is the bottom of the arc, add small margin
  
  const gauge = (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={svgHeight} viewBox={`0 0 ${size} ${svgHeight}`}>
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          strokeWidth="3"
          className="stroke-muted/40"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {clamped > 0 && (
          <path
            d={valPath}
            fill="none"
            strokeWidth="3"
            className={cn(color, "transition-all duration-300")}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-foreground text-[10px] font-bold"
          style={{ fontSize: '10px' }}
        >
          {displayValue}
        </text>
      </svg>
      <span className="text-[9px] text-muted-foreground -mt-1 leading-none">{label}</span>
    </div>
  )

  const [open, setOpen] = useState(false)

  if (detail) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <div onClick={() => setOpen(prev => !prev)} className="cursor-pointer">
              {gauge}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {detail}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return gauge
}
