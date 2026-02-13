"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModelBadge } from "../shared/model-badge"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"
import type { TaskTree } from "@/hooks/useOverviewData"

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

function getHealthPercent(heartbeatAge: number): number {
  if (heartbeatAge < 30) return 100
  if (heartbeatAge < 120) return Math.max(30, 100 - ((heartbeatAge - 30) / 90) * 70)
  return Math.max(0, 30 - ((heartbeatAge - 120) / 180) * 30)
}

export interface LiveCardMobileProps {
  task: TaskTree
}

export function LiveCardMobile({ task }: LiveCardMobileProps) {
  const healthPercent = getHealthPercent(task.heartbeatAge)
  const isStalled = healthPercent < 30
  const initials = task.agentName.slice(0, 2).toUpperCase()

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4",
        "active:bg-accent transition-colors",
        isStalled && "border-red-500/50 bg-red-500/5 dark:bg-red-500/10"
      )}
    >
      {/* Main task */}
      <Link
        href={`/runs/${task.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-background shrink-0">
            <AvatarImage src={`/assets/minion-avatars/${task.agentId}.webp`} alt={task.agentName} onError={(e) => { (e.target as HTMLImageElement).src = "/assets/minion-avatars/default.webp" }} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">{task.agentName}</h3>
              <ModelBadge model={task.model} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {task.task}
            </p>

            {/* Progress bar */}
            <div
              className="mt-2 h-0.5 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={healthPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Task health: ${Math.round(healthPercent)}%`}
            >
              <div
                className={cn(
                  "h-full transition-all",
                  healthPercent > 60 && "bg-green-500",
                  healthPercent > 30 && healthPercent <= 60 && "bg-yellow-500",
                  healthPercent <= 30 && "bg-red-500"
                )}
                style={{ width: `${healthPercent}%` }}
              />
            </div>

            {/* Metadata */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDuration(task.elapsedSeconds)}</span>
              <span aria-hidden="true">·</span>
              <CostDisplay cost={task.cost} className="text-xs" />
            </div>
          </div>
        </div>
      </Link>

      {/* Spawned children (indented sub-lines) */}
      {task.children.length > 0 && (
        <div className="mt-3 pl-13 space-y-2 border-l-2 border-blue-500/30 ml-5">
          {task.children.map((child) => (
            <Link
              key={child.id}
              href={`/runs/${child.id}`}
              className="block text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-2 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">└─</span>
                <span className="font-medium text-foreground">{child.agentName}:</span>
                <span className="text-muted-foreground truncate">{child.task}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
