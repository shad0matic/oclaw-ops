"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AgentStatusDot } from "./agent-status-dot"
import { ModelBadge } from "./model-badge"
import { cn, formatDuration } from "@/lib/utils"
import type { AgentData, TaskTree } from "@/hooks/useOverviewData"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"

export interface AgentTaskInfo {
  task: string
  elapsedSeconds?: number
  model?: string | null
}

interface TreeNode {
  agent: AgentData
  tasks: AgentTaskInfo[]
  children: TreeNode[]
}

interface TeamTreeProps {
  agents: AgentData[]
  liveWork?: { count: number; tasks: TaskTree[] }
}

function buildTree(agents: AgentData[], liveWork?: { count: number; tasks: TaskTree[] }): TreeNode[] {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  const tasksByAgent = new Map<string, AgentTaskInfo[]>()

  // Collect tasks per agent
  for (const t of (liveWork?.tasks || [])) {
    const list = tasksByAgent.get(t.agentId) || []
    list.push({ task: t.task, elapsedSeconds: t.elapsedSeconds, model: t.model })
    tasksByAgent.set(t.agentId, list)
    // Also children
    for (const c of (t.children || [])) {
      const cList = tasksByAgent.get(c.agentId) || []
      cList.push({ task: c.task, elapsedSeconds: c.elapsedSeconds, model: c.model })
      tasksByAgent.set(c.agentId, cList)
    }
  }

  // Build tree nodes
  const nodeMap = new Map<string, TreeNode>()
  for (const agent of agents) {
    nodeMap.set(agent.id, {
      agent,
      tasks: tasksByAgent.get(agent.id) || [],
      children: [],
    })
  }

  const roots: TreeNode[] = []
  for (const agent of agents) {
    const node = nodeMap.get(agent.id)!
    if (agent.reportsTo && nodeMap.has(agent.reportsTo)) {
      nodeMap.get(agent.reportsTo)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort: working agents first, then by role weight
  const roleWeight: Record<string, number> = { lead: 0, senior: 1, agent: 2 }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const aWorking = a.tasks.length > 0 ? 0 : 1
      const bWorking = b.tasks.length > 0 ? 0 : 1
      if (aWorking !== bWorking) return aWorking - bWorking
      return (roleWeight[a.agent.role || 'agent'] || 2) - (roleWeight[b.agent.role || 'agent'] || 2)
    })
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(roots)

  return roots
}

const roleBadge: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-amber-500/20 text-amber-400" },
  senior: { label: "Senior", color: "bg-blue-500/20 text-blue-400" },
  agent: { label: "", color: "" },
}

function AgentNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const { agent, tasks, children } = node
  const isWorking = tasks.length > 0
  const isZombie = agent.status === "zombie"
  const [expanded, setExpanded] = useState(true)
  const hasChildren = children.length > 0
  const badge = roleBadge[agent.role || 'agent']

  return (
    <div>
      <Link
        href={`/agents/${agent.id}`}
        className={cn(
          "flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-all",
          "hover:bg-accent",
          isWorking && "bg-green-500/5",
          isZombie && "bg-red-500/5",
          !isWorking && !isZombie && "opacity-50 hover:opacity-80",
        )}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
      >
        {/* Tree connector line */}
        {depth > 0 && (
          <div className="flex items-center shrink-0 -ml-3 mr-0">
            <div className="w-3 h-px bg-border/50" />
          </div>
        )}

        {/* Expand toggle for nodes with children */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
            className="shrink-0 mt-1 text-muted-foreground/50 hover:text-muted-foreground"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
          </button>
        ) : (
          <div className="w-3 shrink-0" />
        )}

        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={`/assets/minion-avatars/${agent.id}.webp`} alt={agent.name}
            onError={(e) => { (e.target as HTMLImageElement).src = "/assets/minion-avatars/default.webp" }} />
          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{agent.name}</span>
            {badge?.label && (
              <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 shrink-0", badge.color)}>
                {badge.label}
              </span>
            )}
            {tasks.length > 1 && (
              <span className="text-[10px] bg-green-500/20 text-green-400 rounded-full px-1.5 py-0.5 shrink-0">
                {tasks.length} tasks
              </span>
            )}
            <div className="ml-auto shrink-0">
              <AgentStatusDot status={agent.status} />
            </div>
          </div>

          {tasks.length > 0 ? (
            <div className="mt-0.5 space-y-1">
              {tasks.map((t, i) => (
                <div key={i} className="text-xs">
                  <p className="text-green-400 font-medium truncate">{t.task}</p>
                  <div className="flex items-center gap-2">
                    {t.model && <ModelBadge model={t.model} />}
                    {t.elapsedSeconds !== undefined && t.elapsedSeconds > 0 && (
                      <span className="text-muted-foreground">{formatDuration(t.elapsedSeconds)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isZombie ? "🧟 Zombie detected" : "Idle"}
            </p>
          )}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-2 border-l border-border/30"
            style={{ left: `${depth * 20 + 22}px` }}
          />
          {children.map(child => (
            <AgentNode key={child.agent.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamTree({ agents, liveWork }: TeamTreeProps) {
  const tree = useMemo(() => buildTree(agents, liveWork), [agents, liveWork])
  const workingCount = liveWork?.tasks?.length || 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2.5 pb-2">
        <h2 className="text-sm font-medium text-foreground">THE TEAM</h2>
        <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded-full bg-muted">
          {agents.length} agents · {workingCount} working
        </span>
      </div>
      {tree.map(node => (
        <AgentNode key={node.agent.id} node={node} depth={0} />
      ))}
    </div>
  )
}
