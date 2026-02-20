"use client"

import useSWR from 'swr'
import { AlertCircle, ShieldCheck, Axe } from 'lucide-react'
import { AgentAvatar } from '@/components/ui/agent-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function MelStatusIndicator() {
  const { data, error } = useSWR('/api/agents/mel/status', fetcher, {
    refreshInterval: 60000, // every minute
  })

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Mel Status Error</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Failed to load Mel's activity data.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AgentAvatar agentId="mel" size={20} />
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>{timeAgo(data?.lastInspection)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Axe className="h-3 w-3" />
              <span>{timeAgo(data?.lastKill)}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last Inspected / Last Task Killed</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
