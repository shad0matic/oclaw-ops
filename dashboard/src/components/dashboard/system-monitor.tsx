"use client"

import { useEffect, useState } from "react"
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

export function SystemMonitor({ initialData }: { initialData?: SystemData }) {
    const [data, setData] = useState<SystemData | null>(initialData || null)
    const [history, setHistory] = useState<{ time: string; cpu: number; mem: number }[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/system/health")
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                    setHistory(prev => {
                        const now = new Date().toLocaleTimeString()
                        const newPoint = { time: now, cpu: json.cpu.usage, mem: (json.memory.used / json.memory.total) * 100 }
                        return [...prev.slice(-20), newPoint]
                    })
                }
            } catch (e) {
                console.error(e)
            }
        }

        // Initial fetch if no data
        if (!initialData) fetchData()

        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [initialData])

    if (!data) return <div className="text-zinc-500">Loading system stats...</div>

    const memPercent = (data.memory.used / data.memory.total) * 100
    const diskPercent = data.disk ? (data.disk.used / data.disk.total) * 100 : 0

    return (
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-400">CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white mb-4">{data.cpu.usage.toFixed(1)}%</div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                <Area type="monotone" dataKey="cpu" stroke="#ef4444" fillOpacity={1} fill="url(#colorCpu)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-400">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white mb-2">
                        {(data.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB
                        <span className="text-sm font-normal text-zinc-500 ml-2">
                            / {(data.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                        </span>
                    </div>
                    <Progress value={memPercent} className="h-2 mb-4" />

                    <div className="h-[150px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
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
                            {diskPercent.toFixed(1)}% used • {(data.disk.free / 1024 / 1024 / 1024).toFixed(1)} GB free
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
                            <div className="text-zinc-500 text-sm">Node</div>
                            <div className="text-sm font-mono text-white">{process.version}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <div className="text-zinc-500 text-sm">Next.js</div>
                            <div className="text-sm font-mono text-white">16.1.6</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
