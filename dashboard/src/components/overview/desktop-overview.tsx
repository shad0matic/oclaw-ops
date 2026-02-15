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

        {/* Team Tree */}
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

        {/* Pipeline Strip */}
        {overviewData && (
          <PipelineStrip
            pipeline={overviewData.pipeline}
            isLoading={isLoading}
          />
        )}

        {/* Activity Timeline */}
        {overviewData && (
          <ActivityTimeline
            events={overviewData.recentEvents}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
