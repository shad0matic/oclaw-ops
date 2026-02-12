"use client"

import { AgentCard } from "./agent-card"
import type { AgentData } from "@/hooks/useOverviewData"

export interface TeamRosterProps {
  agents: AgentData[]
  isLoading?: boolean
}

export function TeamRoster({ agents, isLoading }: TeamRosterProps) {
  if (isLoading) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Team roster loading"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">THE TEAM</h2>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-muted motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-labelledby="team-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 id="team-heading" className="text-lg font-semibold text-foreground">
          THE TEAM
        </h2>
        <span className="text-sm text-muted-foreground">
          {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
        </span>
      </div>

      {/* Agent Grid */}
      <div
        className="p-6 grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto"
        role="list"
      >
        {agents.map((agent) => (
          <div key={agent.id} role="listitem">
            <AgentCard
              id={agent.id}
              name={agent.name}
              description={agent.description}
              level={agent.level}
              trustScore={agent.trustScore}
              status={agent.status}
              currentTask={agent.currentTask}
              recentZombieKill={agent.recentZombieKill}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
