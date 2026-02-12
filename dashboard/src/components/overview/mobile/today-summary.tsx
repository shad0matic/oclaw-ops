"use client"

import Link from "next/link"
import { CostDisplay } from "../shared/cost-display"
import { cn } from "@/lib/utils"
import type { PipelineData } from "@/hooks/useOverviewData"

export interface TodaySummaryProps {
  pipeline: PipelineData
  dailyCost: number
}

export function TodaySummary({ pipeline, dailyCost }: TodaySummaryProps) {
  return (
    <Link
      href="/runs?date=today"
      className="block border-y border-border bg-card p-4 active:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      aria-label={`Today's progress: ${pipeline.successRate}% success rate. ${pipeline.completed} completed, ${pipeline.failed} failed. Total cost: ${dailyCost.toFixed(2)} euros`}
    >
      <h2 className="text-sm font-medium text-foreground mb-3">TODAY</h2>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full bg-muted overflow-hidden mb-2"
        role="progressbar"
        aria-valuenow={pipeline.successRate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Success rate: ${pipeline.successRate}%`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pipeline.successRate >= 80 && "bg-green-500",
            pipeline.successRate >= 50 && pipeline.successRate < 80 && "bg-yellow-500",
            pipeline.successRate < 50 && "bg-red-500"
          )}
          style={{ width: `${pipeline.successRate}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>
            <span className="text-green-600 dark:text-green-400 font-medium">✓ {pipeline.completed}</span> done
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <span className="text-red-600 dark:text-red-400 font-medium">✗ {pipeline.failed}</span> fail
          </span>
          <span aria-hidden="true">·</span>
          <CostDisplay cost={dailyCost} className="text-xs" />
        </div>
        <span className="text-muted-foreground font-medium">{pipeline.successRate}%</span>
      </div>
    </Link>
  )
}
