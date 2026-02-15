
"use client"

import { useState, useMemo } from "react"
import { HealthPulse } from "./mobile/health-pulse"
import { AlertBanner, type Alert } from "./mobile/alert-banner"
import { AgentBottomSheet } from "./mobile/agent-bottom-sheet"
import { TodaySummary } from "./mobile/today-summary"
import { ActivityCollapsed } from "./mobile/activity-collapsed"
import { useOverviewData, useLiveWork } from "@/hooks/useOverviewData"
import { AgentCard } from "./desktop/agent-card" // Reusing the desktop card
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

  const sortedAgents = useMemo(() => {
    if (!agents) return []
    return [...agents].sort((a, b) => {
      const aTasks = liveWork?.tasks?.filter(t => t.agentId === a.id) || []
      const bTasks = liveWork?.tasks?.filter(t => t.agentId === b.id) || []
      const aIsWorking = aTasks.length > 0
      const bIsWorking = bTasks.length > 0
      const aIsZombie = a.status === "zombie"
      const bIsZombie = b.status === "zombie"

      if (aIsWorking && !bIsWorking) return -1
      if (!aIsWorking && bIsWorking) return 1

      // More tasks = higher priority
      if (aIsWorking && bIsWorking) {
        return bTasks.length - aTasks.length || (bTasks[0]?.elapsedSeconds || 0) - (aTasks[0]?.elapsedSeconds || 0)
      }

      if (aIsZombie && !bIsZombie) return -1
      if (!aIsZombie && bIsZombie) return 1

      return a.name.localeCompare(b.name)
    })
  }, [agents, liveWork])
  
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
      <section className="p-4 space-y-3" aria-labelledby="team-heading-mobile">
        <div className="flex items-center justify-between">
          <h2 id="team-heading-mobile" className="text-sm font-medium text-foreground">
            THE TEAM
          </h2>
          <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded-full bg-muted">
            {agents.length} agents · {liveWork?.count || 0} working
          </span>
        </div>

        {sortedAgents.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl" aria-hidden="true">🤖</p>
            <p className="text-sm font-medium text-foreground">No agents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAgents.map(agent => {
              const agentTasks = liveWork?.tasks?.filter(t => t.agentId === agent.id) || []
              // Also include child tasks (sub-agents spawned by this agent)
              const childTasks = liveWork?.tasks?.flatMap(t => 
                t.children?.filter(c => c.agentId === agent.id) || []
              ) || []
              const allTasks = [...agentTasks, ...childTasks].map(t => ({
                task: t.task,
                elapsedSeconds: t.elapsedSeconds,
                model: t.model,
                source: t.source,
              }))
              return (
                <div key={agent.id} onClick={() => setSelectedAgentId(agent.id)}>
                  <AgentCard
                    agent={agent}
                    tasks={allTasks}
                    isWorking={allTasks.length > 0}
                  />
                </div>
              )
            })}
          </div>
        )}
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
