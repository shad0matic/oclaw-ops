
"use client"

import { useState } from "react"
import { HealthPulse } from "./mobile/health-pulse"
import { AlertBanner, type Alert } from "./mobile/alert-banner"
import { AgentBottomSheet } from "./mobile/agent-bottom-sheet"
import { TodaySummary } from "./mobile/today-summary"
import { ActivityCollapsed } from "./mobile/activity-collapsed"
import { useOverviewData, useLiveWork } from "@/hooks/useOverviewData"
import { TeamTree } from "./shared/team-tree"
interface AgentProfile { id: string; name: string; description: string; level: number; trustScore: number; status: string; currentTask: string | null; }
import type { AgentData, TaskTree } from "@/hooks/useOverviewData"
type LiveWorkData = { count: number; tasks: TaskTree[] }


function generateAlerts(
  tasks: TaskTree[],
  agents: AgentData[]
): Alert[] {
  const alerts: Alert[] = []

  // Check for stalled tasks
  for (const task of tasks) {
    if (task.heartbeatAge > 120) {
      alerts.push({
        id: `stalled-${task.id}`,
        severity: 'warning',
        title: `${task.agentName}'s task stalled`,
        description: `No heartbeat for ${Math.round(task.heartbeatAge / 60)}m`,
        actionUrl: `/runs/${task.id}`
      })
    }
  }

  // Check for zombie agents
  for (const agent of agents) {
    if (agent.status === 'zombie' || agent.recentZombieKill) {
      alerts.push({
        id: `zombie-${agent.id}`,
        severity: 'error',
        title: `Zombie detected: ${agent.name}`,
        description: agent.recentZombieKill ? 'Recently killed' : 'Task stuck',
        actionUrl: `/agents/${agent.id}`
      })
    }
  }

  return alerts
}


export function MobileOverview() {
  const { data: overviewData } = useOverviewData(30000)
  const { liveWork } = useLiveWork(10000)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const agents = overviewData?.team || []
  const alerts = overviewData ? generateAlerts(liveWork?.tasks || [], agents) : []

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  if (!overviewData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-border border-t-foreground motion-safe:animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Health Pulse - Sticky */}
      <HealthPulse
        status={overviewData.system.status}
        activeCount={liveWork?.count || overviewData.liveWork.count}
        dailyCost={overviewData.dailyCost}
        cpu={overviewData.system.cpu}
        memory={overviewData.system.memory}
        load={overviewData.system.load}
      />

      {/* Alert Banner */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* Unified Team Section */}
      <section className="p-4" aria-labelledby="team-heading-mobile">
        <TeamTree agents={agents} liveWork={liveWork || undefined} />
      </section>

      {/* Today Summary */}
      <TodaySummary
        pipeline={overviewData.pipeline}
        dailyCost={overviewData.dailyCost}
      />

      {/* Activity */}
      <ActivityCollapsed events={overviewData.recentEvents} />

      {/* Agent Bottom Sheet */}
      <AgentBottomSheet
        agent={selectedAgent ?? null}
        onClose={() => setSelectedAgentId(null)}
      />
    </div>
  )
}
