
"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AgentCard } from "./agent-card"
import { Skeleton } from "@/components/ui/skeleton"
import { OverviewData, TaskTree } from "@/hooks/useOverviewData"
type LiveWorkData = { count: number; tasks: TaskTree[] }
interface AgentProfile { id: string; name: string; description: string; level: number; trustScore: number; status: 'active' | 'idle' | 'error' | 'zombie' | 'warning'; currentTask: string | null; }

interface UnifiedTeamBoardProps {
  agents: AgentProfile[]
  liveWork: LiveWorkData
  isLoading: boolean
}

export function UnifiedTeamBoard({
  agents,
  liveWork,
  isLoading,
}: UnifiedTeamBoardProps) {
  const sortedAgents = useMemo(() => {
    if (!agents) return []
    return [...agents].sort((a, b) => {
      const aIsWorking = liveWork?.tasks?.some(t => t.agentId === a.id)
      const bIsWorking = liveWork?.tasks?.some(t => t.agentId === b.id)
      const aIsZombie = a.status === "zombie"
      const bIsZombie = b.status === "zombie"

      if (aIsWorking && !bIsWorking) return -1
      if (!aIsWorking && bIsWorking) return 1

      if (aIsWorking && bIsWorking) {
        const aTask = liveWork.tasks.find(t => t.agentId === a.id)
        const bTask = liveWork.tasks.find(t => t.agentId === b.id)
        return (bTask?.elapsedSeconds || 0) - (aTask?.elapsedSeconds || 0)
      }

      if (aIsZombie && !bIsZombie) return -1
      if (!aIsZombie && bIsZombie) return 1

      return a.name.localeCompare(b.name)
    })
  }, [agents, liveWork])

  const workingCount = liveWork?.tasks?.length || 0

  return (
    <div className="bg-card border rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight">THE TEAM</h2>
        <p className="text-sm text-muted-foreground">
          {agents.length} agents · {workingCount} working
        </p>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {sortedAgents.map(agent => {
                const task = liveWork?.tasks?.find(t => t.agentId === agent.id)
                return (
                  <motion.div
                    key={agent.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <AgentCard
                      agent={agent}
                      taskName={task?.task}
                      elapsedSeconds={task?.elapsedSeconds}
                      model={task?.model ?? undefined}
                      isWorking={!!task}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
