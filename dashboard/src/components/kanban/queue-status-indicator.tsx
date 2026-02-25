"use client"

import useSWR from 'swr'
import { Server, Zap } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function QueueStatusIndicator() {
  const { data, error } = useSWR('/api/tasks/queue/status', fetcher, {
    refreshInterval: 5000, // every 5 seconds
  })

  if (error || !data) {
    return null;
  }

  const waiting = data.tasks;
  const latency = data.latency;

  const latencyColor = latency < 1000 ? 'text-green-400' : latency < 5000 ? 'text-yellow-400' : 'text-red-400';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span>{waiting}</span>
            </div>
            <div className={`flex items-center gap-1 ${latencyColor}`}>
              <Zap className="h-3 w-3" />
              <span>{latency.toFixed(2)}ms</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Waiting tasks / DB latency</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
