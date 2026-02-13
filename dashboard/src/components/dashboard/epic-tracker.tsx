"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Skeleton } from "../ui/skeleton"

interface Epic {
  name: string
  total: number
  done: number
  running: number
  pending: number
  failed: number
  progress: number
}

interface Task {
  id: string
  title: string
  status: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function EpicTracker() {
  const { data: epics, error, isLoading } = useSWR<Epic[]>('/api/tasks/epics', fetcher, { refreshInterval: 30000 })
  const [openEpics, setOpenEpics] = useState<Set<string>>(new Set())
  const [taskData, setTaskData] = useState<Record<string, Task[]>>({})
  const [taskLoading, setTaskLoading] = useState<Record<string, boolean>>({})

  const toggleEpic = async (epicName: string) => {
    const newOpenEpics = new Set(openEpics)
    if (newOpenEpics.has(epicName)) {
      newOpenEpics.delete(epicName)
    } else {
      newOpenEpics.add(epicName)
      if (!taskData[epicName]) {
        setTaskLoading(prev => ({ ...prev, [epicName]: true }));
        try {
          const response = await fetch(`/api/tasks/queue?epic=${encodeURIComponent(epicName)}`);
          const tasks = await response.json();
          setTaskData(prev => ({ ...prev, [epicName]: tasks }));
        } catch (err) {
          console.error(`Failed to fetch tasks for epic ${epicName}`, err);
        } finally {
          setTaskLoading(prev => ({ ...prev, [epicName]: false }));
        }
      }
    }
    setOpenEpics(newOpenEpics)
  }

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-4">
        <Skeleton className="w-full h-24 bg-muted" />
        <Skeleton className="w-full h-24 bg-muted" />
        <Skeleton className="w-full h-24 bg-muted" />
      </div>
    )
  }

  if (error) {
    return <div className="text-destructive text-center p-4">Failed to load epics. Please try again later.</div>
  }

  if (!epics || epics.length === 0) {
    return <div className="text-muted-foreground text-center p-4">No epics defined yet. Assign tasks to epics in the kanban.</div>
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {epics.map(epic => (
        <Collapsible key={epic.name} open={openEpics.has(epic.name)} onOpenChange={() => toggleEpic(epic.name)}>
          <Card className="bg-card border-border w-full">
            <CardHeader className="p-2 flex flex-row items-center justify-between cursor-pointer" onClick={() => toggleEpic(epic.name)}>
              <CardTitle className="text-base font-medium text-foreground">{epic.name}</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                  {openEpics.has(epic.name) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CardContent className="p-2">
              <Progress value={epic.progress} className="w-full h-2 bg-muted mb-2" />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="text-green-500">{`${epic.done}/${epic.total} done`}</span>
                <span className="text-blue-500">{`${epic.running} running`}</span>
                <span className="text-gray-500">{`${epic.pending} pending`}</span>
                {epic.failed > 0 && <span className="text-red-500">{`${epic.failed} failed`}</span>}
              </div>
              <CollapsibleContent className="mt-2 pt-2 border-t border-border">
                {taskLoading[epic.name] ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="w-full h-6 bg-muted" />
                    <Skeleton className="w-full h-6 bg-muted" />
                  </div>
                ) : taskData[epic.name]?.length ? (
                  <ul className="space-y-1 text-sm text-foreground">
                    {taskData[epic.name].map(task => (
                      <li key={task.id} className="border-l-2 border-muted pl-2 py-1">
                        {task.title} <span className="text-muted-foreground text-xs">({task.status})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">No tasks found for this epic.</div>
                )}
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  )
}
