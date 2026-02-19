"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModelBadge } from "../shared/model-badge"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"

export interface TaskCardProps {
  id: number
  agentId: string
  agentName: string
  task: string
  model: string | null
  elapsedSeconds: number
  heartbeatAge: number
  heartbeatMsg: string | null
  cost: number
  isSpawned?: boolean
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

function getHealthPercent(heartbeatAge: number): number {
  // Healthy if heartbeat within 30s, warning up to 2min, critical after
  if (heartbeatAge < 30) return 100
  if (heartbeatAge < 120) return Math.max(30, 100 - ((heartbeatAge - 30) / 90) * 70)
  return Math.max(0, 30 - ((heartbeatAge - 120) / 180) * 30)
}

export function TaskCard({
  id,
  agentId,
  agentName,
  task,
  model,
  elapsedSeconds,
  heartbeatAge,
  heartbeatMsg,
  cost,
  isSpawned = false
}: TaskCardProps) {
  const healthPercent = getHealthPercent(heartbeatAge)
  const isStalled = healthPercent < 30
  const initials = agentName.slice(0, 2).toUpperCase()

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        "hover:bg-accent",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        isStalled && "border-red-500/50 bg-red-500/5 dark:bg-red-500/10",
        isSpawned && "ml-8 border-l-4 border-l-blue-500/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link
          href={`/agents/${agentId}`}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${agentName}'s profile`}
        >
          <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage 
              src={`/assets/minion-avatars/${agentId}.webp`} 
              alt={agentName}
              onError={(e) => { (e.target as HTMLImageElement).src = '/assets/minion-avatars/default.webp' }}
            />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">{agentName}</h3>
            <ModelBadge model={model} size="sm" />
          </div>
          <Link
            href={`/runs/${id}`}
            className="mt-1 text-sm text-muted-foreground line-clamp-2 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {task}
          </Link>

          {/* Progress bar */}
          <div
            className="mt-3 h-1 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={healthPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Task health: ${Math.round(healthPercent)}%`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all motion-safe:duration-500",
                healthPercent > 60 && "bg-green-500",
                healthPercent > 30 && healthPercent <= 60 && "bg-yellow-500",
                healthPercent <= 30 && "bg-red-500"
              )}
              style={{ width: `${healthPercent}%` }}
            />
          </div>

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDuration(elapsedSeconds)}</span>
            {model && (
              <>
                <span aria-hidden="true">·</span>
                <span>{model}</span>
              </>
            )}
            {cost > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <CostDisplay cost={cost} className="text-xs" />
              </>
            )}
          </div>

          {/* Heartbeat */}
          {heartbeatMsg && (
            <p
              className="mt-2 text-xs text-muted-foreground italic line-clamp-1"
              aria-live="polite"
            >
              💓 "{heartbeatMsg}"
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
