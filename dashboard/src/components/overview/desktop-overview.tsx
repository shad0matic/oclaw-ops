
"use client"

import { StatusBar } from "./desktop/status-bar"
import { UnifiedTeamBoard } from "./desktop/unified-team-board"
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
      {/* Status Bar - Always visible */}
      {overviewData && (
        <StatusBar
          status={overviewData.system.status}
          uptime={overviewData.system.uptime}
          cpu={overviewData.system.cpu}
          memory={overviewData.system.memory}
          activeCount={liveWork?.count || overviewData.liveWork.count}
          dailyCost={overviewData.dailyCost}
        />
      )}

      {/* Main Layout */}
      <div className="p-6 space-y-6">
        {/* Zombie Alert */}
        {overviewData?.zombies && overviewData.zombies.length > 0 && (
          <ZombieAlertBanner zombies={overviewData.zombies} />
        )}

        {/* Unified Team Board */}
        <UnifiedTeamBoard
          agents={overviewData?.team || []}
          liveWork={liveWork || overviewData?.liveWork || { count: 0, tasks: [] }}
          isLoading={isLoading || (liveWorkLoading && !liveWork)}
        />

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
