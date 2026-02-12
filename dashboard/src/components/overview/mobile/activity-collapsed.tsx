"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { OverviewEvent } from "@/hooks/useOverviewData"

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

  if (diffSec < 60) return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHour = Math.floor(diffMin / 60)
  return `${diffHour}h`
}

function getEventShortDesc(event: OverviewEvent): string {
  const detail = event.detail as any
  const taskShort = (detail?.task || 'task').slice(0, 25)

  switch (event.eventType) {
    case 'task_start':
      return taskShort
    case 'task_complete':
      return taskShort
    case 'task_fail':
      return `${taskShort} (failed)`
    case 'spawn':
      return `→ ${detail?.target_agent || 'agent'}`
    case 'zombie_killed':
      return `killed ${detail?.agent_id || 'zombie'}`
    default:
      return event.eventType
  }
}

export interface ActivityCollapsedProps {
  events: OverviewEvent[]
}

export function ActivityCollapsed({ events }: ActivityCollapsedProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="border-y border-border bg-card">
      {/* Collapsible header */}
      <button
        className={cn(
          "w-full flex items-center justify-between p-4",
          "active:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="activity-panel-mobile"
      >
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span aria-hidden="true">{expanded ? '▼' : '▶'}</span>
          Recent Activity
        </h2>
        <span className="text-xs text-muted-foreground">({events.length})</span>
      </button>

      {/* Expandable panel */}
      {expanded && (
        <div
          id="activity-panel-mobile"
          className="border-t border-border"
          role="region"
          aria-labelledby="activity-heading-mobile"
        >
          <ul className="divide-y divide-border max-h-80 overflow-y-auto" role="list">
            {events.slice(0, 15).map((event) => (
              <li key={event.id} className="px-4 py-2.5 flex items-start gap-2 text-xs">
                {/* Time */}
                <time
                  className="text-muted-foreground w-8 shrink-0 text-right"
                  dateTime={event.createdAt}
                >
                  {formatRelativeTime(event.createdAt)}
                </time>

                {/* Icon */}
                <span
                  className={cn(
                    "w-4 text-center",
                    EVENT_COLORS[event.eventType] || "text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {EVENT_ICONS[event.eventType] || "•"}
                </span>

                {/* Description */}
                <p className="flex-1 min-w-0 text-foreground">
                  <span className="font-medium">{event.agentName}</span>
                  <span className="text-muted-foreground">: {getEventShortDesc(event)}</span>
                </p>
              </li>
            ))}
          </ul>

          {/* View all link */}
          <div className="p-4 border-t border-border">
            <Link
              href="/events"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            >
              View All Activity →
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
