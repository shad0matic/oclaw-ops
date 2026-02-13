"use client"

import { cn } from "@/lib/utils"

interface MiniLoadGaugeProps {
  value: number
  label: string
  detail?: string
  size?: number
  className?: string
  cores: number
}

export function MiniLoadGauge({ value, label, detail, size = 48, cores, className }: MiniLoadGaugeProps) {
  const clamped = Math.min(cores, Math.max(0, value))
  const percentage = (clamped / cores) * 100
  // Semi-circle arc from 180° to 0° (left to right, bottom half)
  const radius = (size - 6) / 2
  const cx = size / 2
  const cy = size / 2 + 2
  const startAngle = Math.PI      // 180° (left)
  const endAngle = 0              // 0° (right)
  const sweepAngle = startAngle - (startAngle - endAngle) * (percentage / 100)

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
  const largeArc = percentage > 50 ? 1 : 0
  const valPath = `M ${valX1} ${valY1} A ${radius} ${radius} 0 ${largeArc} 1 ${valX2} ${valY2}`

  // Color based on value
  const color = percentage > 90
    ? "stroke-red-500"
    : percentage > 70
    ? "stroke-orange-500"
    : "stroke-green-500"

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
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
          {value.toFixed(2)}
        </text>
      </svg>
      <span className="text-[9px] text-muted-foreground -mt-1 leading-none">{label}</span>
      {detail && <span className="text-[8px] text-muted-foreground/70 leading-none">{detail}</span>}
    </div>
  )
}
