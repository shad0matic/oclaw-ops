"use client"

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7c43',
    '#a855f7',
]

interface CostByModelProps {
    data: Array<{
        model: string
        costUsd: number
        runCount: number
    }>
}

export function CostByModelChart({ data }: CostByModelProps) {
    const chartData = data.filter(d => d.costUsd > 0).map((d, i) => ({
        name: d.model.split('/').pop() || d.model,
        value: d.costUsd,
        runs: d.runCount,
        color: COLORS[i % COLORS.length],
    }))

    if (chartData.length === 0) {
        return (
            <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cost by Model</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No cost data available
                </CardContent>
            </Card>
        )
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-popover border border-border rounded-md p-2 shadow-lg">
                    <p className="font-medium text-sm">{data.name}</p>
                    <p className="text-sm text-muted-foreground">${(Number(data.value) || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{data.runs} runs</p>
                </div>
            )
        }
        return null
    }

    return (
        <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cost by Model</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

interface CostByAgentProps {
    data: Array<{
        agent: string
        costUsd: number
        runCount: number
    }>
}

export function CostByAgentChart({ data }: CostByAgentProps) {
    const chartData = data
        .filter(d => d.costUsd > 0)
        .slice(0, 8)
        .map((d) => ({
            name: d.agent,
            cost: d.costUsd,
            runs: d.runCount,
        }))

    if (chartData.length === 0) {
        return (
            <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cost by Agent</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No cost data available
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cost by Agent</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" tickFormatter={(v) => `$${(Number(v) || 0).toFixed(0)}`} fontSize={10} />
                        <YAxis type="category" dataKey="name" width={60} fontSize={10} />
                        <Tooltip
                            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

interface DailyCostTrendProps {
    data: Array<{
        day: string
        costUsd: number
        runCount: number
    }>
}

export function DailyCostTrendChart({ data }: DailyCostTrendProps) {
    const chartData = data.map((d) => ({
        day: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cost: d.costUsd,
        runs: d.runCount,
    }))

    if (chartData.length === 0) {
        return (
            <Card className="bg-card/50 border-border col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Daily Cost Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No cost data available
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card/50 border-border col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Cost Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="day" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis 
                            tickFormatter={(v) => `$${(Number(v) || 0).toFixed(0)}`} 
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip
                            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="cost" 
                            stroke="hsl(var(--chart-1))" 
                            fillOpacity={1} 
                            fill="url(#colorCost)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
