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

// Interpolate between two hex colors
function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = parseInt(color1.slice(1), 16)
  const c2 = parseInt(color2.slice(1), 16)
  
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff
  
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Get color for Load gauge (raw value): green < 1, red > 6, gradient between
function getLoadColor(loadValue: number): string {
  const green = "#22c55e"   // green-500
  const yellow = "#eab308"  // yellow-500
  const orange = "#f97316"  // orange-500
  const red = "#ef4444"     // red-500
  
  if (loadValue <= 1) return green
  if (loadValue >= 6) return red
  
  // 1-3: green → yellow
  if (loadValue <= 3) {
    return lerpColor(green, yellow, (loadValue - 1) / 2)
  }
  // 3-5: yellow → orange
  if (loadValue <= 5) {
    return lerpColor(yellow, orange, (loadValue - 3) / 2)
  }
  // 5-6: orange → red
  return lerpColor(orange, red, (loadValue - 5) / 1)
}

// Get color for percentage gauges (RAM): green < 70%, orange 70-90%, red > 90%
function getPercentColor(percent: number): string {
  if (percent > 90) return "#ef4444"  // red-500
  if (percent > 70) return "#f97316"  // orange-500
  return "#22c55e"  // green-500
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
  
  // Color based on type
  const fillColor = type === 'raw' 
    ? getLoadColor(value)
    : getPercentColor(clamped)

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
