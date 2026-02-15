"use client"
import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

/**
 * SSE hook that listens to /api/tasks/stream and auto-invalidates
 * task-related queries when changes are detected.
 * Falls back gracefully if SSE is unavailable.
 */
export function useTaskStream() {
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["task-queue"] })
    queryClient.invalidateQueries({ queryKey: ["backlog"] })
  }, [queryClient])

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimeout: NodeJS.Timeout | null = null
    let retryCount = 0

    function connect() {
      es = new EventSource("/api/tasks/stream")

      es.onmessage = (event) => {
        retryCount = 0 // reset on successful message
        try {
          const data = JSON.parse(event.data)
          // Invalidate queries so kanban/overview refresh
          invalidate()
        } catch {
          // ignore parse errors (heartbeats etc)
        }
      }

      es.onerror = () => {
        es?.close()
        // Exponential backoff: 2s, 4s, 8s, max 30s
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000)
        retryCount++
        retryTimeout = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      es?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [invalidate])
}
