"use client"

import useSWR from "swr"
import { AgentEntity, type AgentData } from "@/entities/agent"

const fetcher = (url: string) => fetch(url).then(r => r.json())

/**
 * Single source of truth for agent data.
 * Returns AgentEntity instances with computed properties (mood, successRate, etc.)
 * Use everywhere instead of fetching agent data directly.
 */
export function useAgents(refreshInterval = 10000) {
  const { data, error, isLoading, mutate } = useSWR<AgentData[]>(
    '/api/agents/registry',
    fetcher,
    { refreshInterval, dedupingInterval: 5000 }
  )

  const entities = (data || []).map(d => new AgentEntity(d))

  return {
    agents: entities,
    agentsData: data || [],  // plain objects for prop passing
    isLoading,
    error,
    mutate,
    getAgent: (id: string) => entities.find(a => a.id === id) || null,
  }
}
