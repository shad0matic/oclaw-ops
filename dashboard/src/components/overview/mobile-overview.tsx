"use client"

import { useState } from "react"
import { HealthPulse } from "./mobile/health-pulse"
import { AlertBanner, type Alert } from "./mobile/alert-banner"
import { LiveCardMobile } from "./mobile/live-card-mobile"
import { TeamStrip } from "./mobile/team-strip"
import { AgentBottomSheet } from "./mobile/agent-bottom-sheet"
import { TodaySummary } from "./mobile/today-summary"
import { ActivityCollapsed } from "./mobile/activity-collapsed"
import { useOverviewData, useLiveWork } from "@/hooks/useOverviewData"
import type { AgentData, TaskTree } from "@/hooks/useOverviewData"

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

  // Check for low trust
  for (const agent of agents) {
    if (agent.trustScore < 0.5) {
      alerts.push({
        id: `trust-${agent.id}`,
        severity: 'warning',
        title: `Low trust: ${agent.name}`,
        description: `Trust score: ${Math.round(agent.trustScore * 100)}%`,
        actionUrl: `/agents/${agent.id}`
      })
    }
  }

  return alerts
}

export function MobileOverview() {
  const { data: overviewData } = useOverviewData(30000)
  const { liveWork } = useLiveWork(10000)
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)

  const tasks = liveWork?.tasks || overviewData?.liveWork.tasks || []
  const agents = overviewData?.team || []
  const alerts = overviewData ? generateAlerts(tasks, agents) : []

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
      />

      {/* Alert Banner */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* Live Work */}
      <section className="p-4 space-y-3" aria-labelledby="live-work-heading-mobile">
        <div className="flex items-center justify-between">
          <h2 id="live-work-heading-mobile" className="text-sm font-medium text-foreground">
            LIVE NOW
          </h2>
          <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded-full bg-muted">
            {tasks.length}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl" aria-hidden="true">😴</p>
            <p className="text-sm font-medium text-foreground">All agents idle</p>
            <p className="text-xs text-muted-foreground">No tasks running</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <LiveCardMobile key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      {/* Team Strip */}
      <TeamStrip agents={agents} onAgentClick={setSelectedAgent} />

      {/* Today Summary */}
      <TodaySummary
        pipeline={overviewData.pipeline}
        dailyCost={overviewData.dailyCost}
      />

      {/* Activity */}
      <ActivityCollapsed events={overviewData.recentEvents} />

      {/* Agent Bottom Sheet */}
      <AgentBottomSheet
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  )
}
