"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface TaskTree {
  id: number
  agentId: string
  agentName: string
  task: string
  model: string | null
  startedAt: string
  elapsedSeconds: number
  heartbeatAge: number
  heartbeatMsg: string | null
  cost: number
  spawnedBy: string | null
  children: TaskTree[]
  source?: string
}

export interface AgentData {
  id: string
  name: string
  description: string
  level: number
  trustScore: number
  totalTasks: number
  successfulTasks: number
  status: 'active' | 'idle' | 'error' | 'zombie'
  currentTask: string | null
  recentZombieKill: boolean
}

export interface PipelineData {
  queued: number
  running: number
  completed: number
  failed: number
  successRate: number
}

export interface OverviewEvent {
  id: number
  agentId: string
  agentName: string
  eventType: string
  detail: Record<string, unknown>
  costUsd: number
  tokensUsed: number
  createdAt: string
}

export interface OverviewData {
  system: {
    status: 'online' | 'offline' | 'degraded'
    uptime: number
    dashboardUptime?: number
    cpu: number
    memory: number
    load?: number[]
    cores?: number
  }
  liveWork: {
    count: number
    tasks: TaskTree[]
  }
  team: AgentData[]
  pipeline: PipelineData
  dailyCost: number
  recentEvents: OverviewEvent[]
  zombies: any[]
}

export function useOverviewData(refreshInterval = 30000) {
  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    '/api/overview',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )

  return { data, error, isLoading, refresh: mutate }
}

// Separate hooks for components that need faster polling
export function useLiveWork(refreshInterval = 10000) {
  const { data, error, isLoading } = useSWR<OverviewData>(
    '/api/overview',
    fetcher,
    { refreshInterval, revalidateOnFocus: true, dedupingInterval: 5000 }
  )
  return { liveWork: data?.liveWork, error, isLoading }
}
