"use client"

import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { cn } from "@/lib/utils"

interface MiniGaugeProps {
  value: number       // 0-100 for percentage, raw value otherwise
  label: string       // "Load" or "RAM"
  className?: string
  type?: 'percentage' | 'raw'
  max?: number        // max value for raw type
  size?: number       // total size in px
}

export function MiniGauge({ 
  value, 
  label, 
  className, 
  type = 'percentage', 
  max = 1,
  size = 60 
}: MiniGaugeProps) {
  const percentage = type === 'percentage' ? value : (value / max) * 100
  const displayValue = type === 'percentage' ? `${Math.round(value)}%` : value.toFixed(2)
  const clamped = Math.min(100, Math.max(0, percentage))
  
  // Color based on value
  const fillColor = clamped > 90
    ? "#ef4444"  // red-500
    : clamped > 70
    ? "#f97316"  // orange-500
    : "#22c55e"  // green-500

  const data = [{ value: clamped, fill: fillColor }]

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size / 2 + 8 }}>
        <RadialBarChart
          width={size}
          height={size / 2 + 8}
          cx={size / 2}
          cy={size / 2 + 4}
          innerRadius={size / 2 - 10}
          outerRadius={size / 2 - 2}
          barSize={6}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: 'hsl(var(--muted) / 0.3)' }}
            dataKey="value"
            cornerRadius={3}
            angleAxisId={0}
          />
        </RadialBarChart>
        {/* Center text */}
        <div 
          className="absolute inset-0 flex items-end justify-center"
          style={{ paddingBottom: 4 }}
        >
          <span className="text-[11px] font-bold tabular-nums">{displayValue}</span>
        </div>
      </div>
      <span className="text-[9px] text-muted-foreground -mt-1">{label}</span>
    </div>
  )
}
