"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface CostData {
    daily: { day: string; fixed: number; variable: number; total: number }[]
    month: { fixed: number; variable: number; total: number }
    fxRate: { usdEur: number; asOf: string } | null
}

function getGlowColor(variableEur: number): { color: string; ring: string; pulse: boolean } {
    if (variableEur <= 0) return { color: "text-zinc-500", ring: "", pulse: false }
    if (variableEur <= 10) return { color: "text-green-400", ring: "ring-green-500/30 shadow-green-500/20", pulse: false }
    if (variableEur <= 100) return { color: "text-orange-400", ring: "ring-orange-500/40 shadow-orange-500/30", pulse: true }
    return { color: "text-red-400", ring: "ring-red-500/50 shadow-red-500/40", pulse: true }
}

function getGradientId(variableEur: number): { id: string; color: string } {
    if (variableEur <= 10) return { id: "costGreen", color: "#22c55e" }
    if (variableEur <= 100) return { id: "costOrange", color: "#f97316" }
    return { id: "costRed", color: "#ef4444" }
}

export function CostCard() {
    const [data, setData] = useState<CostData | null>(null)

    useEffect(() => {
        const fetchCosts = async () => {
            try {
                const res = await fetch("/api/costs?days=30")
                if (res.ok) setData(await res.json())
            } catch {}
        }
        fetchCosts()
        const interval = setInterval(fetchCosts, 300_000) // Refresh every 5min
        return () => clearInterval(interval)
    }, [])

    if (!data) return null

    const { month } = data
    // Only show if there are any variable costs
    if (month.variable <= 0 && data.daily.every(d => d.variable <= 0)) return null

    const glow = getGlowColor(month.variable)
    const grad = getGradientId(month.variable)

    // Format daily data for chart
    const chartData = data.daily.map(d => ({
        day: new Date(d.day).toLocaleDateString([], { day: '2-digit', month: 'short' }),
        variable: d.variable,
        fixed: d.fixed,
        total: d.total,
    }))

    return (
        <Card className={`bg-zinc-900/50 border-zinc-800 backdrop-blur-sm transition-all duration-1000
            ${glow.ring ? `ring-1 ${glow.ring} shadow-lg` : ''}
            ${glow.pulse ? 'animate-pulse-slow' : ''}`}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                    Monthly Costs
                </CardTitle>
                <DollarSign className={`h-4 w-4 ${glow.color}`} />
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-2xl font-bold ${glow.color}`}>
                        €{month.variable.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500">variable</span>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                    + €{month.fixed.toFixed(2)} fixed = €{month.total.toFixed(2)} total
                    {data.fxRate && (
                        <span className="ml-1">· USD/EUR {data.fxRate.usdEur.toFixed(4)}</span>
                    )}
                </p>

                {chartData.length > 1 && (
                    <div className="h-[120px] w-full min-w-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={grad.id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={grad.color} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={grad.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 11 }}
                                    formatter={(v: any) => [`€${Number(v).toFixed(2)}`, 'Variable']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="variable"
                                    stroke={grad.color}
                                    strokeWidth={1.5}
                                    fillOpacity={1}
                                    fill={`url(#${grad.id})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
