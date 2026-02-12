"use client"

import { TaskTree } from "./task-tree"
import type { TaskTree as TaskTreeType } from "@/hooks/useOverviewData"
import { AgentStatusDot } from "../shared/agent-status-dot"

export interface LiveWorkPanelProps {
  tasks: TaskTreeType[]
  count: number
  isLoading?: boolean
}

export function LiveWorkPanel({ tasks, count, isLoading }: LiveWorkPanelProps) {
  if (isLoading) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Live work tasks loading"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AgentStatusDot status="active" withPulse />
            LIVE
          </h2>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
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

  if (tasks.length === 0) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-12 text-center"
        aria-label="No active tasks"
      >
        <div className="space-y-3">
          <p className="text-4xl" aria-hidden="true">😴</p>
          <p className="text-lg font-medium text-foreground">All agents idle</p>
          <p className="text-sm text-muted-foreground">No tasks running right now</p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-labelledby="live-work-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2
          id="live-work-heading"
          className="text-lg font-semibold text-foreground flex items-center gap-2"
        >
          <AgentStatusDot status="active" withPulse />
          LIVE
        </h2>
        <span
          className="text-sm font-medium text-foreground px-2.5 py-0.5 rounded-full bg-muted"
          aria-label={`${count} active tasks`}
        >
          {count}
        </span>
      </div>

      {/* Task Trees */}
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto" role="list">
        {tasks.map((task) => (
          <div key={task.id} role="listitem">
            <TaskTree task={task} />
          </div>
        ))}
      </div>
    </section>
  )
}
