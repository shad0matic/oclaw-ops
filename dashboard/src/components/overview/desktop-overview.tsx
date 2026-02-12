
"use client"

import { StatusBar } from "./desktop/status-bar"
import { LiveWorkPanel } from "./desktop/live-work-panel"
import { TeamRoster } from "./desktop/team-roster"
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

        {/* Top Section: Live Work + Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Work Panel */}
          <div className="lg:col-span-1">
            <LiveWorkPanel
              tasks={liveWork?.tasks || overviewData?.liveWork.tasks || []}
              count={liveWork?.count || overviewData?.liveWork.count || 0}
              isLoading={liveWorkLoading && !liveWork}
            />
          </div>

          {/* Team Roster */}
          <div className="lg:col-span-1">
            <TeamRoster
              agents={overviewData?.team || []}
              isLoading={isLoading}
            />
          </div>
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
