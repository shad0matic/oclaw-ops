"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AgentStatusDot } from "../shared/agent-status-dot"
import { cn } from "@/lib/utils"
import type { AgentData } from "@/hooks/useOverviewData"

export interface AgentBottomSheetProps {
  agent: AgentData | null
  onClose: () => void
}

function getTrustColor(score: number): string {
  if (score >= 0.8) return "text-green-600 dark:text-green-400"
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

export function AgentBottomSheet({ agent, onClose }: AgentBottomSheetProps) {
  // Focus trap and escape key handler
  useEffect(() => {
    if (!agent) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [agent, onClose])

  if (!agent) return null

  const initials = agent.name.slice(0, 2).toUpperCase()
  const trustPercent = Math.round(agent.trustScore * 100)
  const isLead = agent.name.toLowerCase() === "kevin"

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-border bg-card shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-border">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1">
                <AgentStatusDot
                  status={agent.status}
                  withPulse={agent.status === 'active'}
                  className="h-4 w-4 border-2 border-background"
                />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="sheet-title" className="text-lg font-semibold text-foreground">
                  {agent.name}
                </h2>
                {isLead && (
                  <span className="text-amber-500 dark:text-amber-400" aria-label="Team lead">
                    👑
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{agent.description || "Agent"}</p>
            </div>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="font-medium text-foreground">{agent.level}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trust</dt>
              <dd className={cn("font-medium", getTrustColor(agent.trustScore))}>
                {trustPercent}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Tasks</dt>
              <dd className="font-medium text-foreground">{agent.totalTasks}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Successful</dt>
              <dd className="font-medium text-foreground">{agent.successfulTasks}</dd>
            </div>
          </dl>

          {/* Current Activity */}
          {agent.currentTask && (
            <div className="mb-6 p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Currently</p>
              <p className="text-sm text-foreground">
                <span className="text-green-600 dark:text-green-400">▶</span> {agent.currentTask}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/agents/${agent.id}`}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-center text-foreground hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
            >
              View Profile
            </Link>
            <Link
              href={`/runs?agent=${agent.id}`}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
            >
              View Tasks
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
