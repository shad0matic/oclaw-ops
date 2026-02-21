"use client"
import { StatusBar } from "@/components/overview/desktop/status-bar"
import { useOverviewData, useLiveWork } from "@/hooks/useOverviewData"
import { useKanban } from "@/contexts/KanbanContext"

export function GlobalStatusBar() {
  const { data: overviewData, isLoading } = useOverviewData(30000)
  const { liveWork } = useLiveWork(10000)
  const { totalRunningTasks, filteredRunningTasks } = useKanban()

  const activeTasks = liveWork?.count ?? overviewData?.liveWork?.count ?? 0;
  const countsMismatch = totalRunningTasks > 0 && activeTasks !== filteredRunningTasks;

  if (isLoading) {
    return (
      <div className="flex h-12 items-center gap-4 border-b border-border bg-card px-4 text-sm">
        <div className="flex h-full w-28 items-center justify-center border-r border-border pr-4">
          {/* Minimal loading state */}
        </div>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }
  
  return (
    <StatusBar
      status={overviewData?.system.status || 'degraded'}
      uptime={overviewData?.system.uptime || 0}
      dashboardUptime={overviewData?.system.dashboardUptime}
      liveWork={liveWork ?? overviewData?.liveWork ?? { count: 0, tasks: [] }}
      dailyCost={overviewData?.dailyCost || 0}
    />
  )
}
