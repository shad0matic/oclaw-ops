"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { PipelineData } from "@/hooks/useOverviewData"

export interface PipelineStripProps {
  pipeline: PipelineData
  isLoading?: boolean
}

interface Stage {
  id: 'queued' | 'running' | 'completed' | 'failed'
  label: string
  count: number
  colorClass: string
}

export function PipelineStrip({ pipeline, isLoading }: PipelineStripProps) {
  const stages: Stage[] = [
    {
      id: 'queued',
      label: 'Queued',
      count: pipeline.queued,
      colorClass: 'text-muted-foreground'
    },
    {
      id: 'running',
      label: 'Running',
      count: pipeline.running,
      colorClass: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'completed',
      label: 'Completed',
      count: pipeline.completed,
      colorClass: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'failed',
      label: 'Failed',
      count: pipeline.failed,
      colorClass: 'text-red-600 dark:text-red-400'
    }
  ]

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="h-24 rounded bg-muted motion-safe:animate-pulse" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      aria-labelledby="pipeline-heading"
    >
      <h2 id="pipeline-heading" className="text-sm font-medium text-foreground mb-4">
        Pipeline <span className="text-muted-foreground font-normal">(last 24h)</span>
      </h2>

      {/* Stage indicators */}
      <div className="flex items-center gap-2" role="list">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2 flex-1" role="listitem">
            <Link
              href={`/runs?status=${stage.id}`}
              className={cn(
                "flex-1 rounded-lg border border-border bg-background p-4 text-center transition-colors",
                "hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
              aria-label={`${stage.label}: ${stage.count} tasks`}
            >
              <div className={cn("text-2xl font-bold", stage.colorClass)}>
                {stage.count}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stage.label}</div>
            </Link>

            {i < stages.length - 1 && (
              <span className="text-muted-foreground text-xl" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Success rate bar */}
      <div className="mt-6">
        <div
          className="h-2 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pipeline.successRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Success rate: ${pipeline.successRate}%`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all motion-safe:duration-500",
              pipeline.successRate >= 80 && "bg-green-500",
              pipeline.successRate >= 50 && pipeline.successRate < 80 && "bg-yellow-500",
              pipeline.successRate < 50 && "bg-red-500"
            )}
            style={{ width: `${pipeline.successRate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {pipeline.successRate}% success rate
        </p>
      </div>
    </section>
  )
}
