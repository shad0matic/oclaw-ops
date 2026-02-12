"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export interface Alert {
  id: string
  severity: 'error' | 'warning'
  title: string
  description: string
  actionUrl?: string
}

export interface AlertBannerProps {
  alerts: Alert[]
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Load dismissed alerts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissed-alerts')
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)))
      } catch {}
    }
  }, [])

  // Save dismissed alerts to localStorage
  const handleDismiss = (id: string) => {
    const newDismissed = new Set([...dismissed, id])
    setDismissed(newDismissed)
    localStorage.setItem('dismissed-alerts', JSON.stringify([...newDismissed]))
  }

  const visibleAlerts = alerts.filter(alert => !dismissed.has(alert.id)).slice(0, 3)

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-2 px-4 py-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          aria-live="polite"
          className={cn(
            "rounded-lg border p-4",
            alert.severity === 'error' && "bg-red-500/10 border-red-500/30 dark:bg-red-500/20",
            alert.severity === 'warning' && "bg-yellow-500/10 border-yellow-500/30 dark:bg-yellow-500/20"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
            </div>
            <span
              className={cn(
                "text-xl shrink-0",
                alert.severity === 'error' ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
              )}
              aria-hidden="true"
            >
              {alert.severity === 'error' ? '🔴' : '⚠️'}
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            {alert.actionUrl && (
              <a
                href={alert.actionUrl}
                className="text-xs font-medium px-3 py-1.5 rounded bg-foreground text-background hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View
              </a>
            )}
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label={`Dismiss alert: ${alert.title}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
