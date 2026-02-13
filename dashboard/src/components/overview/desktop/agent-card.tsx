
"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
}
import { AgentStatusDot } from "../shared/agent-status-dot"
import { ModelBadge } from "../shared/model-badge"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/utils"

export interface AgentCardProps {
  agent: AgentProfile
  taskName?: string
  elapsedSeconds?: number
  model?: string
  isWorking?: boolean
}

export function AgentCard({
  agent,
  taskName,
  elapsedSeconds,
  model,
  isWorking,
}: AgentCardProps) {
  const { id, name, description, level, trustScore, status } = agent
  const initials = name.slice(0, 2).toUpperCase()
  const isZombie = status === "zombie"
  const opacity = isWorking || isZombie ? "opacity-100" : "opacity-60"

  return (
    <Link
      href={`/agents/${id}`}
      className={cn(
        "block rounded-lg border bg-card p-3 transition-all",
        "hover:bg-accent hover:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isWorking && "border-green-500/50 shadow-md",
        isZombie && "border-red-500/50 animate-pulse",
        opacity
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={`/assets/minion-avatars/${id}.webp`} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">{name}</h3>
            <AgentStatusDot status={status} />
          </div>

          {isWorking && taskName ? (
            <div className="mt-1">
              <p className="text-xs text-green-400 font-medium truncate">
                {taskName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {model && <ModelBadge model={model} />}
                {elapsedSeconds !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(elapsedSeconds)}
                  </span>
                )}
              </div>
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

