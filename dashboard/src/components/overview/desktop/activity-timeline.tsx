"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CostDisplay } from "../shared/cost-display"
import type { OverviewEvent } from "@/hooks/useOverviewData"

export interface ActivityTimelineProps {
  events: OverviewEvent[]
  isLoading?: boolean
  defaultExpanded?: boolean
}

const EVENT_ICONS: Record<string, string> = {
  task_start: "▶",
  task_complete: "✓",
  task_fail: "✗",
  spawn: "👶",
  zombie_killed: "🧹",
  auto_demote: "📉",
  level_change: "📈",
  commit: "📝"
}

const EVENT_COLORS: Record<string, string> = {
  task_start: "text-blue-600 dark:text-blue-400",
  task_complete: "text-green-600 dark:text-green-400",
  task_fail: "text-red-600 dark:text-red-400",
  spawn: "text-blue-600 dark:text-blue-400",
  zombie_killed: "text-red-600 dark:text-red-400",
  auto_demote: "text-yellow-600 dark:text-yellow-400",
  level_change: "text-green-600 dark:text-green-400",
  commit: "text-muted-foreground"
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  return `${Math.floor(diffHour / 24)}d ago`
}

function getEventDescription(event: OverviewEvent): string {
  const detail = event.detail as any

  switch (event.eventType) {
    case 'task_start':
      return `started "${detail?.task || 'unknown task'}"`
    case 'task_complete':
      return `completed "${detail?.task || 'unknown task'}"`
    case 'task_fail':
      return `failed "${detail?.task || 'unknown task'}"${detail?.error ? ` (${detail.error})` : ''}`
    case 'spawn':
      return `spawned ${detail?.target_agent || 'agent'} for "${detail?.task || 'task'}"`
    case 'zombie_killed':
      return `killed zombie (${detail?.agent_id || 'agent'}, stuck ${detail?.stuck_duration || 'unknown'})`
    case 'auto_demote':
      return `demoted to level ${detail?.new_level || '?'}`
    case 'level_change':
      return `promoted to level ${detail?.new_level || '?'}`
    case 'commit':
      return `made ${detail?.count || 1} commit(s)`
    default:
      return event.eventType
  }
}

export function ActivityTimeline({ events, isLoading, defaultExpanded = false }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="h-12 rounded bg-muted motion-safe:animate-pulse" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      {/* Collapsible header */}
      <button
        className={cn(
          "w-full flex items-center justify-between p-4",
          "hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="activity-panel"
      >
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span aria-hidden="true">{expanded ? '▼' : '▶'}</span>
          Activity
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {events.length} events in last 24h
          </span>
          <Link
            href="/events"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
            onClick={(e) => e.stopPropagation()}
          >
            View All →
          </Link>
        </div>
      </button>

      {/* Expandable panel */}
      {expanded && (
        <div
          id="activity-panel"
          className="border-t border-border"
          role="region"
          aria-labelledby="activity-heading"
        >
          <ul className="divide-y divide-border max-h-96 overflow-y-auto" role="list">
            {events.slice(0, 20).map((event) => (
              <li key={event.id} className="px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors">
                {/* Timestamp */}
                <time
                  className="text-xs text-muted-foreground w-14 shrink-0 text-right"
                  dateTime={event.createdAt}
                >
                  {formatRelativeTime(event.createdAt)}
                </time>

                {/* Icon */}
                <span
                  className={cn(
                    "text-sm w-4 text-center",
                    EVENT_COLORS[event.eventType] || "text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {EVENT_ICONS[event.eventType] || "•"}
                </span>

                {/* Description */}
                <p className="text-sm text-foreground flex-1 min-w-0">
                  <span className="font-medium">{event.agentName}</span>{" "}
                  <span className="text-muted-foreground">
                    {getEventDescription(event)}
                  </span>
                  {event.costUsd > 0 && (
                    <>
                      {" "}·{" "}
                      <CostDisplay cost={event.costUsd} className="text-xs" />
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>

          {events.length > 20 && (
            <div className="p-4 border-t border-border">
              <Link
                href="/events"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                )}
              >
                Load more ({events.length - 20} hidden)
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
