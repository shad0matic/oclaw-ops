"use client"

import { cn } from "@/lib/utils"

interface MiniGaugeProps {
  value: number       // 0-100 for percentage, raw value otherwise
  label: string       // "CPU" or "RAM"
  detail?: string     // e.g. "3.2/22GB"
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
  const radius = (size - 6) / 2
  const cx = size / 2
  const cy = size / 2 + 2
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
          {displayValue}
        </text>
      </svg>
      <span className="text-[9px] text-muted-foreground -mt-1 leading-none">{label}</span>
      {detail && <span className="text-[8px] text-muted-foreground/70 leading-none whitespace-nowrap max-w-[60px] overflow-hidden text-ellipsis">{detail}</span>}
    </div>
  )
}
