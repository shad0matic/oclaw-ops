"use client"

import { TaskCard } from "./task-card"
import type { TaskTree as TaskTreeType } from "@/hooks/useOverviewData"

export interface TaskTreeProps {
  task: TaskTreeType
}

export function TaskTree({ task }: TaskTreeProps) {
  return (
    <div className="space-y-2">
      {/* Root task */}
      <TaskCard
        id={task.id}
        agentId={task.agentId}
        agentName={task.agentName}
        task={task.task}
        model={task.model}
        elapsedSeconds={task.elapsedSeconds}
        heartbeatAge={task.heartbeatAge}
        heartbeatMsg={task.heartbeatMsg}
        cost={task.cost}
      />

      {/* Spawned children */}
      {task.children.length > 0 && (
        <div className="space-y-2" role="list" aria-label="Spawned tasks">
          {task.children.map((child) => (
            <div key={child.id} role="listitem">
              <TaskCard
                id={child.id}
                agentId={child.agentId}
                agentName={child.agentName}
                task={child.task}
                model={child.model}
                elapsedSeconds={child.elapsedSeconds}
                heartbeatAge={child.heartbeatAge}
                heartbeatMsg={child.heartbeatMsg}
                cost={child.cost}
                isSpawned
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
