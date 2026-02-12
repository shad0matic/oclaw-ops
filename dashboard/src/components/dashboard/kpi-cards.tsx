"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Cpu, Database, Zap, CheckCircle2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface KPICardsProps {
    kevinStatus: {
        status: "online" | "offline"
        uptime: number
    }
    serverLoad: {
        cpu: number
        memory: number
    }
    completedTasks: number
}

// 1h window sparkline for the KPI card
const MAX_SPARKLINE = 120
const POLL_MS = 30_000

export function KPICards({ kevinStatus, serverLoad, completedTasks }: KPICardsProps) {
    const [cpuHistory, setCpuHistory] = useState<{ v: number }[]>([{ v: serverLoad.cpu }])
    const [currentCpu, setCurrentCpu] = useState(serverLoad.cpu)
    const [currentMem, setCurrentMem] = useState(serverLoad.memory)

    const fetchLoad = useCallback(async () => {
        try {
            const res = await fetch("/api/system/health")
            if (res.ok) {
                const json = await res.json()
                const cpu = json.cpu?.usage ?? 0
                const mem = json.memory?.used ?? 0
                setCurrentCpu(cpu)
                setCurrentMem(mem)
                setCpuHistory(prev => [...prev.slice(-(MAX_SPARKLINE - 1)), { v: cpu }])
            }
        } catch {}
    }, [])

    // Load historical data from buffer on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetch("/api/system/metrics?hours=1")
                if (res.ok) {
                    const points = await res.json()
                    if (points.length > 0) {
                        setCpuHistory(points.map((p: any) => ({ v: p.cpu })))
                        const last = points[points.length - 1]
                        setCurrentCpu(last.cpu)
                    }
                }
            } catch {}
        }
        loadHistory()

        const interval = setInterval(fetchLoad, POLL_MS)
        return () => clearInterval(interval)
    }, [fetchLoad])

    // Compute 1h avg
    const cpuAvg = cpuHistory.length > 0
        ? cpuHistory.reduce((a, b) => a + b.v, 0) / cpuHistory.length
        : currentCpu

    return (
        <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Key Performance Indicators">
            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Kevin Status</CardTitle>
                    <Activity 
                        className={`h-4 w-4 ${kevinStatus.status === 'online' ? 'text-green-500' : 'text-red-500'}`} 
                        aria-hidden="true"
                    />
                </CardHeader>
                <CardContent>
                    <div 
                        className="text-2xl font-bold text-white"
                        aria-label={`System status: ${kevinStatus.status}`}
                    >
                        {kevinStatus.status === 'online' ? 'Online' : 'Offline'}
                    </div>
                    <p className="text-xs text-zinc-500">
                        {kevinStatus.status === 'online' ? `Uptime: ${(kevinStatus.uptime / 3600).toFixed(1)}h` : 'System down'}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                        Model: Claude Opus 4-6
                    </p>
                </CardContent>
            </Card>

{/* Token Usage card removed — data not yet wired */}

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Server Load</CardTitle>
                    <Cpu className="h-4 w-4 text-blue-500" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white" aria-label={`CPU usage at ${(currentCpu ?? 0).toFixed(1)} percent`}>
                        {(currentCpu ?? 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">
                        Mem: {((currentMem ?? 0) / 1024 / 1024 / 1024).toFixed(1)}GB · avg {(cpuAvg ?? 0).toFixed(1)}%
                    </p>
                    {cpuHistory.length > 1 && (
                        <div className="h-[32px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <AreaChart data={cpuHistory}>
                                    <defs>
                                        <linearGradient id="sparkCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#sparkCpu)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

{/* Active Workflows card removed — not relevant yet */}

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CardTitle className="text-sm font-medium text-zinc-400">Tasks Completed</CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Number of significant tasks marked as 'completed' by agents today. Event logging is pending integration.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white" aria-label={`${completedTasks} tasks completed today`}>
                        {completedTasks}
                    </div>
                    <p className="text-xs text-zinc-500">
                        Today
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
