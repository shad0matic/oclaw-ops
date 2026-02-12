"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AgentStatusDot } from "../shared/agent-status-dot"
import { cn } from "@/lib/utils"
import type { AgentData } from "@/hooks/useOverviewData"

export interface TeamStripProps {
  agents: AgentData[]
  onAgentClick: (agent: AgentData) => void
}

const ROLE_ABBREV: Record<string, string> = {
  kevin: "Lead",
  bob: "UI",
  "dr. nefario": "Res",
  nefario: "Res",
  "x reader": "X",
  stuart: "DB",
  mel: "Sec",
  dave: "Fin"
}

function getRoleAbbrev(name: string, description: string): string {
  const nameLower = name.toLowerCase()
  if (ROLE_ABBREV[nameLower]) return ROLE_ABBREV[nameLower]

  if (description.toLowerCase().includes("frontend") || description.toLowerCase().includes("ui")) return "UI"
  if (description.toLowerCase().includes("research")) return "Res"
  if (description.toLowerCase().includes("security")) return "Sec"
  if (description.toLowerCase().includes("database") || description.toLowerCase().includes("db")) return "DB"
  if (description.toLowerCase().includes("cost") || description.toLowerCase().includes("finance")) return "Fin"
  if (description.toLowerCase().includes("twitter") || description.toLowerCase().includes("x ")) return "X"

  return name.slice(0, 4)
}

export function TeamStrip({ agents, onAgentClick }: TeamStripProps) {
  return (
    <section
      className="border-y border-border bg-card py-4"
      aria-labelledby="team-strip-heading"
    >
      <div className="px-4 flex items-center justify-between mb-3">
        <h2 id="team-strip-heading" className="text-sm font-medium text-foreground">
          TEAM
        </h2>
        <span className="text-xs text-muted-foreground">{agents.length}</span>
      </div>

      <div
        className="flex gap-4 px-4 overflow-x-auto pb-2 scrollbar-thin"
        role="list"
      >
        {agents.map((agent) => {
          const initials = agent.name.slice(0, 2).toUpperCase()
          const roleAbbrev = getRoleAbbrev(agent.name, agent.description)

          return (
            <button
              key={agent.id}
              onClick={() => onAgentClick(agent)}
              className={cn(
                "flex flex-col items-center gap-2 min-w-[72px] shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-2",
                "active:bg-accent transition-colors"
              )}
              aria-label={`View ${agent.name}'s profile. Status: ${agent.status}`}
              role="listitem"
            >
              {/* Avatar with status */}
              <div className="relative">
                <Avatar
                  className={cn(
                    "h-12 w-12 ring-2 ring-offset-1 ring-offset-background",
                    agent.status === 'active' && "ring-green-500",
                    agent.status === 'idle' && "ring-zinc-400 dark:ring-zinc-600",
                    agent.status === 'error' && "ring-red-500",
                    agent.status === 'zombie' && "ring-red-500 motion-safe:animate-pulse"
                  )}
                >
                  <AvatarImage src={`/assets/minion-avatars/${agent.id}.webp`} alt={agent.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <AgentStatusDot
                    status={agent.status}
                    withPulse={agent.status === 'active'}
                    className="h-3 w-3 border-2 border-background"
                  />
                </span>
              </div>

              {/* Name and role */}
              <div className="text-center">
                <p className="text-xs font-medium text-foreground truncate w-16">
                  {agent.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate w-16">
                  {roleAbbrev}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
