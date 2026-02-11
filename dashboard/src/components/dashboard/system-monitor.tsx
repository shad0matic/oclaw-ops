"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface SystemData {
    cpu: { usage: number }
    memory: { total: number; used: number; free: number }
    disk?: { total: number; used: number; free: number }
    db?: { size: number; connections: number }
    openclaw?: { version: string; status: string }
    backup?: { next_in_hours: number }
    uptime: number
}

interface HistoryPoint {
    time: string
    ts: number
    cpu: number
    mem: number
}

// 1h window at 30s intervals = 120 points max
const MAX_HISTORY = 120
const POLL_INTERVAL = 30_000

function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatTimeShort(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function SystemMonitor({ initialData }: { initialData?: SystemData }) {
    const [data, setData] = useState<SystemData | null>(initialData || null)
    const [history, setHistory] = useState<HistoryPoint[]>([])

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/system/health")
            if (res.ok) {
                const json = await res.json()
                setData(json)
                const now = new Date()
                const oneHourAgo = now.getTime() - 3600_000
                setHistory(prev => {
                    const newPoint: HistoryPoint = {
                        time: formatTimeShort(now),
                        ts: now.getTime(),
                        cpu: json.cpu.usage,
                        mem: (json.memory.used / json.memory.total) * 100
                    }
                    // Keep only points within the last hour
                    const filtered = [...prev, newPoint].filter(p => p.ts > oneHourAgo)
                    return filtered.slice(-MAX_HISTORY)
                })
            }
        } catch (e) {
            console.error(e)
        }
    }, [])

    useEffect(() => {
        if (!initialData) fetchData()
        else {
            // Seed initial point
            const now = new Date()
            setHistory([{
                time: formatTimeShort(now),
                ts: now.getTime(),
                cpu: initialData.cpu.usage,
                mem: (initialData.memory.used / initialData.memory.total) * 100
            }])
        }

        const interval = setInterval(fetchData, POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [initialData, fetchData])

    if (!data) return <div className="text-zinc-500">Loading system stats...</div>

    const memPercent = (data.memory.used / data.memory.total) * 100
    const diskPercent = data.disk ? (data.disk.used / data.disk.total) * 100 : 0

    // Compute 1h stats
    const cpuValues = history.map(p => p.cpu)
    const memValues = history.map(p => p.mem)
    const cpuAvg = cpuValues.length ? (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) : 0
    const cpuMax = cpuValues.length ? Math.max(...cpuValues) : 0
    const memAvg = memValues.length ? (memValues.reduce((a, b) => a + b, 0) / memValues.length) : 0

    // Time range label
    const windowMin = history.length > 1
        ? Math.round((history[history.length - 1].ts - history[0].ts) / 60_000)
        : 0

    return (
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-zinc-400">CPU Usage</CardTitle>
                        <span className="text-xs text-zinc-600">
                            {windowMin > 0 ? `${windowMin}min window` : 'collecting...'}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-3xl font-bold text-white">{data.cpu.usage.toFixed(1)}%</span>
                        <span className="text-sm text-zinc-500">
                            avg {cpuAvg.toFixed(1)}% · peak {cpuMax.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    interval="preserveStartEnd"
                                    tickCount={5}
                                />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 12 }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                    formatter={(v: any) => [`${v.toFixed(1)}%`, 'CPU']}
                                />
                                <Area type="monotone" dataKey="cpu" stroke="#ef4444" fillOpacity={1} fill="url(#colorCpu)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-zinc-400">Memory Usage</CardTitle>
                        <span className="text-xs text-zinc-600">
                            avg {memAvg.toFixed(1)}%
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-white">
                            {(data.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB
                        </span>
                        <span className="text-sm text-zinc-500">
                            / {(data.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB ({memPercent.toFixed(1)}%)
                        </span>
                    </div>
                    <Progress value={memPercent} className="h-2 mb-3" />

                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    interval="preserveStartEnd"
                                    tickCount={5}
                                />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 12 }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                    formatter={(v: any) => [`${v.toFixed(1)}%`, 'Memory']}
                                />
                                <Area type="monotone" dataKey="mem" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMem)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {data.disk && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-400">Disk Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-2">
                            {(data.disk.used / 1024 / 1024 / 1024).toFixed(1)} GB
                            <span className="text-sm font-normal text-zinc-500 ml-2">
                                / {(data.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB
                            </span>
                        </div>
                        <Progress value={diskPercent} className="h-2 mb-2" />
                        <div className="text-xs text-zinc-500">
                            {diskPercent.toFixed(1)}% used · {(data.disk.free / 1024 / 1024 / 1024).toFixed(1)} GB free
                        </div>
                    </CardContent>
                </Card>
            )}

            {data.db && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-400">Database</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="text-zinc-500 text-sm">Size</div>
                            <div className="text-2xl font-bold text-white">
                                {(data.db.size / 1024 / 1024).toFixed(1)} MB
                            </div>
                        </div>
                        <div>
                            <div className="text-zinc-500 text-sm">Active Connections</div>
                            <div className="text-2xl font-bold text-white">{data.db.connections}</div>
                        </div>
                    </CardContent>
                </Card>
            )}
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <div className="text-zinc-500 text-sm">Uptime</div>
                            <div className="text-xl font-mono text-white">
                                {(data.uptime / 3600).toFixed(1)}h
                            </div>
                        </div>
                        {data.openclaw && (
                            <>
                                <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                                    <div className="text-zinc-500 text-sm">OpenClaw</div>
                                    <div className="text-xl font-mono text-white">{data.openclaw.version}</div>
                                </div>
                                <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                                    <div className="text-zinc-500 text-sm">Status</div>
                                    <div className="text-xl font-mono text-green-500">{data.openclaw.status}</div>
                                </div>
                            </>
                        )}
                        {data.backup && (
                            <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                                <div className="text-zinc-500 text-sm">Next Backup</div>
                                <div className="text-xl font-mono text-white">{data.backup.next_in_hours}h</div>
                            </div>
                        )}
                        <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <div className="text-zinc-500 text-sm">Samples</div>
                            <div className="text-xl font-mono text-white">{history.length}/120</div>
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <div className="text-zinc-500 text-sm">Poll Rate</div>
                            <div className="text-xl font-mono text-white">30s</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
