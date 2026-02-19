"use client"
import { AgentEntity } from "@/entities/agent"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AgentStatusDot } from "../shared/agent-status-dot"
import { ModelBadge } from "../shared/model-badge"
import { cn, formatDuration } from "@/lib/utils"

interface AgentProfile {
  id: string
  name: string
  description: string
  level: number
  trustScore: number
  status: 'active' | 'idle' | 'error' | 'zombie' | 'warning'
  currentTask: string | null
  recentZombieKill?: boolean
  currentModel?: string | null
  activeSessions?: number
  runningTasks?: number
  plannedTasks?: number
}

export interface AgentTaskInfo {
  task: string
  elapsedSeconds?: number
  model?: string | null
  source?: string
}

export interface AgentCardProps {
  agent: AgentProfile
  /** @deprecated Use `tasks` instead */
  taskName?: string
  /** @deprecated Use `tasks` instead */
  elapsedSeconds?: number
  /** @deprecated Use `tasks` instead */
  model?: string
  isWorking?: boolean
  tasks?: AgentTaskInfo[]
}

export function AgentCard({
  agent,
  taskName,
  elapsedSeconds,
  model,
  isWorking,
  tasks = [],
}: AgentCardProps) {
  const { id, name, level, status } = agent
  const initials = name.slice(0, 2).toUpperCase()
  const isZombie = status === "zombie"
  const hasWork = isWorking || tasks.length > 0
  const opacity = hasWork || isZombie ? "opacity-100" : "opacity-60"

  // Backward compat: if tasks array empty but old props provided
  const allTasks: AgentTaskInfo[] = tasks.length > 0
    ? tasks
    : taskName
      ? [{ task: taskName, elapsedSeconds, model }]
      : []

  return (
    <Link
      href={`/agents/${id}`}
      className={cn(
        "block rounded-lg border bg-card p-3 transition-all",
        "hover:bg-accent hover:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        hasWork && "border-green-500/50 shadow-md",
        isZombie && "border-red-500/50 animate-pulse",
        opacity
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={AgentEntity.avatarUrl(id)} alt={name} onError={(e) => { (e.target as HTMLImageElement).src = "/assets/minion-avatars/default.webp" }} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{name}</h3>
              {allTasks.length > 1 && (
                <span className="text-[10px] bg-green-500/20 text-green-400 rounded-full px-1.5 py-0.5">
                  {allTasks.length} tasks
                </span>
              )}
            </div>
            <AgentStatusDot status={status} />
          </div>

          {allTasks.length > 0 ? (
            <div className="mt-1 space-y-1.5">
              {allTasks.map((t, i) => (
                <div key={i} className={cn(
                  "text-xs",
                  i === 0 ? "" : "pl-2 border-l border-green-500/30"
                )}>
                  <p className="text-green-400 font-medium truncate">{t.task}</p>
                  <div className="flex items-center gap-2">
                    {t.model && <ModelBadge model={t.model} />}
                    {t.elapsedSeconds !== undefined && t.elapsedSeconds > 0 && (
                      <span className="text-muted-foreground">
                        {formatDuration(t.elapsedSeconds)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {isZombie ? "Zombie detected" : "Idle"}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
