"use client"

import { AgentStrip } from "@/components/dashboard/agent-strip"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { CostCard } from "@/components/dashboard/cost-card"
import { ActiveTasks } from "@/components/dashboard/active-tasks"
import { MemoryIntegrity } from "@/components/dashboard/memory-integrity"
import { SubAgentMonitor } from "@/components/dashboard/subagent-monitor"
import { Badge } from "@/components/ui/badge"

interface DashboardClientProps {
    initialData: {
        enrichedAgents: any[]
        serializedEvents: any[]
        kevinStatus: {
            status: "online" | "offline"
            uptime: number
        }
        serverLoad: {
            cpu: number
            memory: number
        }
    }
}

function StatusBadge({ status, uptime }: { status: "online" | "offline", uptime: number }) {
    const isOnline = status === "online"
    const uptimeHours = (uptime / 3600).toFixed(1)
    
    return (
        <Badge 
            variant="outline" 
            className={`text-xs px-2 py-0.5 h-5 ${
                isOnline 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
        >
            <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOnline ? `Online · ${uptimeHours}h` : 'Offline'}
        </Badge>
    )
}

function ServerLoadBadge({ cpu, memory }: { cpu: number, memory: number }) {
    const memoryGB = (memory / 1024 / 1024 / 1024).toFixed(1)
    
    return (
        <span className="text-sm text-zinc-500">
            CPU {cpu.toFixed(1)}% · Mem {memoryGB}GB
        </span>
    )
}

export const DashboardClient = ({ initialData }: DashboardClientProps) => {
    const { enrichedAgents, serializedEvents, kevinStatus, serverLoad } = initialData

    return (
        <div className="space-y-8">
            <DataRefresh />

            {/* Compact header row with status badges */}
            <div>
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 
                        className="text-4xl font-bold tracking-tight" 
                        style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}
                    >
                        {process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Minions Control"}
                    </h2>
                    <StatusBadge status={kevinStatus.status} uptime={kevinStatus.uptime} />
                    <ServerLoadBadge cpu={serverLoad.cpu} memory={serverLoad.memory} />
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                    {process.env.NEXT_PUBLIC_DASHBOARD_SUBTITLE || "Your agent workforce at a glance — KPIs, activity, costs, and system health."}
                </p>
            </div>

            <CostCard />

            <div className="grid gap-4 md:grid-cols-2">
                <SubAgentMonitor />
                <div className="space-y-4">
                    <ActiveTasks />
                    <MemoryIntegrity />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-8">
                    <ActivityFeed events={serializedEvents} />
                </div>
                <div className="md:col-span-4 space-y-4">
                    <AgentStrip agents={enrichedAgents} />
                </div>
            </div>
        </div>
    )
}
