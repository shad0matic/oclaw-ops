"use client"

import { useState } from "react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { AgentStrip } from "@/components/dashboard/agent-strip"
import { IsometricOfficeWrapper } from "@/components/dashboard/isometric-office"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DataRefresh } from "@/components/data-refresh"
import { CostCard } from "@/components/dashboard/cost-card"
import { ActiveTasks } from "@/components/dashboard/active-tasks"
import { MemoryIntegrity } from "@/components/dashboard/memory-integrity"
import { AgentLiveStatus } from "@/components/dashboard/agent-live-status"

export const DashboardClient = ({ initialData }: { initialData: any }) => {
    const [viewMode, setViewMode] = useState<'office' | 'grid'>('office');
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
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-zinc-400">Agent View</h3>
                    <div>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm rounded-l-md ${viewMode === 'grid' ? 'bg-yellow-500 text-black' : 'bg-zinc-700 text-white'}`}>Grid View</button>
                        <button onClick={() => setViewMode('office')} className={`px-3 py-1 text-sm rounded-r-md ${viewMode === 'office' ? 'bg-yellow-500 text-black' : 'bg-zinc-700 text-white'}`}>Office View</button>
                    </div>
                </div>
                {viewMode === 'office' ? <IsometricOfficeWrapper /> : <AgentStrip agents={enrichedAgents} />}
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
