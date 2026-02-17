"use client"

import { TeamTree } from "./shared/team-tree"
import { PipelineStrip } from "./desktop/pipeline-strip"
import { ActivityTimeline } from "./desktop/activity-timeline"
import { useOverviewData, useLiveWork } from "@/hooks/useOverviewData"
import { ZombieAlertBanner } from "@/components/dashboard/ZombieAlertBanner"

export function DesktopOverview() {
  const { data: overviewData, isLoading: overviewLoading } = useOverviewData(30000)
  const { liveWork, isLoading: liveWorkLoading } = useLiveWork(10000)

  const isLoading = overviewLoading && !overviewData

  return (
    <div className="min-h-screen bg-background">
      {/* Main Layout */}
      <div className="p-6 space-y-6">
        {/* Zombie Alert */}
        {overviewData?.zombies && overviewData.zombies.length > 0 && (
          <ZombieAlertBanner zombies={overviewData.zombies} />
        )}

        {/* Two-column layout: Team + Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(500px,600px)_1fr] gap-6">
          {/* Team Tree - Compact */}
          <div className="bg-card border rounded-lg shadow-sm p-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading team...</div>
            ) : (
              <TeamTree
                agents={overviewData?.team || []}
                liveWork={liveWork || overviewData?.liveWork || { count: 0, tasks: [] }}
              />
            )}
          </div>

          {/* Activity Timeline - Takes remaining space */}
          {overviewData && (
            <ActivityTimeline
              events={overviewData.recentEvents}
              isLoading={isLoading}
              defaultExpanded={true}
            />
          )}
        </div>

        {/* Pipeline Strip - Summary at bottom */}
        {overviewData && (
          <PipelineStrip
            pipeline={overviewData.pipeline}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
