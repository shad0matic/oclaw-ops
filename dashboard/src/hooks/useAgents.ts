"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  description: string
  level: number
  trustScore: number
  totalTasks: number
  successfulTasks: number
  avatarUrl: string
  status: 'active' | 'idle' | 'error' | 'zombie'
  currentTask: string | null
  currentModel: string | null
}

/**
 * Single source of truth for agent data.
 * Use this hook everywhere instead of fetching agent data directly.
 * Refreshes every 10s by default.
 */
export function useAgents(refreshInterval = 10000) {
  const { data, error, isLoading, mutate } = useSWR<Agent[]>(
    '/api/agents/registry',
    fetcher,
    { refreshInterval, dedupingInterval: 5000 }
  )

  return {
    agents: data || [],
    isLoading,
    error,
    mutate,
    getAgent: (id: string) => data?.find(a => a.id === id) || null,
  }
}
