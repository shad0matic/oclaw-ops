"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AgentStatusDot } from "../shared/agent-status-dot"
import { cn } from "@/lib/utils"

export interface AgentCardProps {
  id: string
  name: string
  description: string
  level: number
  trustScore: number
  status: 'active' | 'idle' | 'error' | 'zombie'
  currentTask: string | null
  recentZombieKill?: boolean
}

const ROLE_ICONS: Record<string, string> = {
  kevin: "👑",
  bob: "🎨",
  nefario: "🔬",
  "dr. nefario": "🔬",
  "x reader": "📰",
  stuart: "🔒",
  mel: "🛡️",
  dave: "💰"
}

function getRoleIcon(name: string, description: string): string {
  const nameLower = name.toLowerCase()
  if (ROLE_ICONS[nameLower]) return ROLE_ICONS[nameLower]

  // Derive from description
  if (description.toLowerCase().includes("frontend") || description.toLowerCase().includes("ui")) return "🎨"
  if (description.toLowerCase().includes("research")) return "🔬"
  if (description.toLowerCase().includes("security")) return "🛡️"
  if (description.toLowerCase().includes("database") || description.toLowerCase().includes("db")) return "🔒"
  if (description.toLowerCase().includes("cost") || description.toLowerCase().includes("finance")) return "💰"
  if (description.toLowerCase().includes("twitter") || description.toLowerCase().includes("x ")) return "📰"

  return "🤖"
}

function getTrustColor(score: number): string {
  if (score >= 0.8) return "text-green-600 dark:text-green-400"
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

export function AgentCard({
  id,
  name,
  description,
  level,
  trustScore,
  status,
  currentTask,
  recentZombieKill
}: AgentCardProps) {
  const initials = name.slice(0, 2).toUpperCase()
  const trustPercent = Math.round(trustScore * 100)
  const roleIcon = getRoleIcon(name, description)
  const isLead = name.toLowerCase() === "kevin"

  return (
    <Link
      href={`/agents/${id}`}
      className={cn(
        "block rounded-lg border border-border bg-card p-4",
        "hover:bg-accent transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        recentZombieKill && "ring-2 ring-red-500/50 motion-safe:animate-pulse"
      )}
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${description}. Status: ${status}. Trust: ${trustPercent}%. ${currentTask ? `Currently: ${currentTask}` : 'Idle'}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with status */}
        <div className="relative">
          <Avatar
            className={cn(
              "h-12 w-12 ring-2 ring-offset-2 ring-offset-background",
              status === 'active' && "ring-green-500",
              status === 'idle' && "ring-zinc-400 dark:ring-zinc-600",
              status === 'error' && "ring-red-500",
              status === 'zombie' && "ring-red-500 motion-safe:animate-pulse"
            )}
          >
            <AvatarImage src={`/assets/minion-avatars/${id}.webp`} alt={name} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Status dot */}
          <span className="absolute -bottom-0.5 -right-0.5">
            <AgentStatusDot
              status={status}
              withPulse={status === 'active'}
              className="h-3 w-3 border-2 border-background"
            />
          </span>
          {/* Zombie overlay */}
          {recentZombieKill && (
            <span
              className="absolute inset-0 flex items-center justify-center text-2xl"
              aria-hidden="true"
            >
              🧟
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">{name}</h3>
            {isLead && (
              <span className="text-amber-500 dark:text-amber-400" aria-label="Team lead">
                👑
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {roleIcon} {description || "Agent"}
          </p>

          {/* Trust score */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Level {level}</span>
            <span aria-hidden="true">·</span>
            <span className={cn("font-medium", getTrustColor(trustScore))}>
              Trust {trustPercent}%
            </span>
          </div>

          {/* Current activity */}
          <p
            className={cn(
              "mt-1.5 text-xs truncate",
              status === 'active'
                ? "text-green-600 dark:text-green-400"
                : status === 'zombie'
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}
          >
            {status === 'zombie' && recentZombieKill
              ? "🧹 Zombie killed recently"
              : currentTask
              ? `▶ ${currentTask}`
              : "idle"}
          </p>
        </div>
      </div>
    </Link>
  )
}
