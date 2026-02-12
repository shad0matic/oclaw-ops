"use client"

import { KPICards } from "@/components/dashboard/kpi-cards"
import { AgentStrip } from "@/components/dashboard/agent-strip"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { CostCard } from "@/components/dashboard/cost-card"
import { ActiveTasks } from "@/components/dashboard/active-tasks"
import { MemoryIntegrity } from "@/components/dashboard/memory-integrity"
import { AgentLiveStatus } from "@/components/dashboard/agent-live-status"

export const DashboardClient = ({ initialData }: { initialData: any }) => {
    const { enrichedAgents, kpiData, serializedEvents } = initialData;

    return (
        <div className="space-y-8">
            <DataRefresh />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div><h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>{process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Minions Control"}</h2><p className="text-sm text-zinc-500 mb-4">{process.env.NEXT_PUBLIC_DASHBOARD_SUBTITLE || "Your agent workforce at a glance — KPIs, activity, costs, and system health."}</p></div>
            </div>

            <KPICards {...kpiData} />

            <CostCard />

            <div className="grid gap-4 md:grid-cols-2">
                <ActiveTasks />
                <MemoryIntegrity />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-400">Minions</h3>
                <AgentStrip agents={enrichedAgents} />
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                    <ActivityFeed events={serializedEvents} />
                </div>
                <div className="col-span-4">
                    <AgentLiveStatus />
                </div>
            </div>
        </div>
    )
}
