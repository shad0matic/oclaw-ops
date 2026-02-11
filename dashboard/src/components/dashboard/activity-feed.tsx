"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getAgent, getAgentAvatar, getAgentName } from "@/lib/agent-names"

interface Event {
    id: number
    agent_id: string
    event_type: string
    detail: any
    context_id?: number | null
    created_at: string
}

interface ActivityFeedProps {
    events: Event[]
}

// --- Grouping logic ---

interface GroupedItem {
    type: "single" | "commit_group" | "task_group"
    events: Event[]
    agent_id: string
    key: string
}

function groupEvents(events: Event[]): GroupedItem[] {
    const items: GroupedItem[] = []
    let i = 0

    while (i < events.length) {
        const ev = events[i]

        // Group consecutive commits from same agent within 15min
        if (ev.event_type === "commit") {
            const group: Event[] = [ev]
            let j = i + 1
            while (j < events.length) {
                const next = events[j]
                if (
                    next.event_type === "commit" &&
                    next.agent_id === ev.agent_id &&
                    Math.abs(new Date(ev.created_at).getTime() - new Date(next.created_at).getTime()) < 15 * 60 * 1000
                ) {
                    group.push(next)
                    j++
                } else {
                    break
                }
            }
            if (group.length > 1) {
                items.push({ type: "commit_group", events: group, agent_id: ev.agent_id, key: `cg-${ev.id}` })
            } else {
                items.push({ type: "single", events: [ev], agent_id: ev.agent_id, key: `s-${ev.id}` })
            }
            i = j
            continue
        }

        // Task with linked events (via context_id)
        if (ev.event_type === "task_start" && ev.context_id) {
            const contextId = ev.context_id
            const linked = events.filter(
                (e, idx) => idx > i && e.context_id === contextId && e.event_type !== "task_start"
            )
            if (linked.length > 0) {
                items.push({
                    type: "task_group",
                    events: [ev, ...linked],
                    agent_id: ev.agent_id,
                    key: `tg-${ev.id}`,
                })
                // Skip the linked events in main loop
                const linkedIds = new Set(linked.map((e) => e.id))
                i++
                // We don't skip — they may appear out of order. Mark them handled below.
                continue
            }
        }

        items.push({ type: "single", events: [ev], agent_id: ev.agent_id, key: `s-${ev.id}` })
        i++
    }

    return items
}

// --- Formatting ---

function formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return ""
    const totalSec = Math.round(ms / 1000)
    if (totalSec < 60) return `${totalSec}s`
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`
    const hr = Math.floor(min / 60)
    const remMin = min % 60
    return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`
}

function statusBadge(status?: string): { label: string; className: string } | null {
    switch (status) {
        case "done":
        case "complete":
        case "completed":
        case "success":
            return { label: "✅ Complete", className: "bg-green-500/10 text-green-400 border-green-500/20" }
        case "running":
        case "in_progress":
            return { label: "🔄 Running", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
        case "error":
        case "failed":
            return { label: "❌ Failed", className: "bg-red-500/10 text-red-400 border-red-500/20" }
        case "stalled":
            return { label: "⏸️ Stalled", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
        default:
            return null
    }
}

function formatSingleEvent(event: Event): { text: string; status?: string } {
    const { event_type, detail } = event
    const name = getAgentName(event.agent_id)
    const dur = formatDuration(detail?.duration)
    const durStr = dur ? ` in ${dur}` : ""

    switch (event_type) {
        case "commit": {
            const msg = detail?.message || "untitled commit"
            const repo = detail?.repo ? ` (${detail.repo})` : ""
            return { text: `committed: ${msg}${repo}` }
        }
        case "task_start":
            return { text: `started: "${detail?.task || "a task"}"`, status: "running" }
        case "task_complete":
            return { text: `completed: "${detail?.task || "a task"}"${durStr}`, status: "complete" }
        case "task_fail":
            return { text: `failed: "${detail?.task || "a task"}" — ${detail?.error || "unknown error"}`, status: "failed" }
        case "task_stalled":
            return { text: `stalled: "${detail?.task || "a task"}" (no heartbeat)`, status: "stalled" }
        case "spawn_stalled":
            return { text: `🪦 sub-agent died: "${detail?.task || "a task"}" (${Math.floor((detail?.elapsed || 0) / 60)}m, no response)`, status: "stalled" }
        case "session_spawn":
            return { text: `spawned sub-agent for "${detail?.task || "a task"}"`, status: "running" }
        case "file_write":
            return { text: `wrote ${detail?.path || "a file"}`, status: "complete" }
        case "error":
            return { text: `error: ${detail?.message || detail?.error || "unknown"}`, status: "failed" }
        case "heartbeat":
            return { text: `heartbeat check${detail?.checks ? ` (${detail.checks.join(", ")})` : ""}` }
        default: {
            const desc = detail?.description || detail?.task || detail?.summary || detail?.message
            if (desc) return { text: desc, status: detail?.status }
            return { text: event_type.replace(/_/g, " "), status: detail?.status }
        }
    }
}

function timeAgo(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 1) return "just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    return `${diffDays}d ago`
}

// --- Components ---

function CommitGroup({ events, agent_id }: { events: Event[]; agent_id: string }) {
    const [expanded, setExpanded] = useState(false)
    const agent = getAgent(agent_id)
    const repos = [...new Set(events.map((e) => e.detail?.repo).filter(Boolean))]
    const repoStr = repos.length > 0 ? ` in ${repos.join(", ")}` : ""

    return (
        <div className="border-b border-zinc-800/50 pb-4 last:border-0">
            <div className="flex items-start gap-3 text-sm">
                <Avatar className="h-8 w-8 border border-zinc-700 mt-0.5 shrink-0">
                    <AvatarImage src={getAgentAvatar(agent_id)} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">{agent.emoji}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{agent.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-400 border-zinc-700">
                            {events.length} commits{repoStr}
                        </Badge>
                        <span className="text-xs text-zinc-500 ml-auto shrink-0">
                            {timeAgo(events[0].created_at)}
                        </span>
                    </div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-left text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <span className="text-xs">
                            {expanded ? "▾" : "▸"} {events[0].detail?.message || "commits"}
                            {events.length > 1 && !expanded && ` (+${events.length - 1} more)`}
                        </span>
                    </button>
                    {expanded && (
                        <ul className="mt-1 space-y-0.5 text-xs text-zinc-500">
                            {events.map((e) => (
                                <li key={e.id} className="flex gap-2">
                                    <code className="text-amber-400/70 font-mono">{e.detail?.hash || "?"}</code>
                                    <span className="truncate">{e.detail?.message || "?"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

function TaskGroup({ events, agent_id }: { events: Event[]; agent_id: string }) {
    const [expanded, setExpanded] = useState(false)
    const agent = getAgent(agent_id)
    const startEvent = events.find((e) => e.event_type === "task_start")
    const endEvent = events.find((e) => ["task_complete", "task_fail", "task_stalled"].includes(e.event_type))
    const commits = events.filter((e) => e.event_type === "commit")
    const taskName = startEvent?.detail?.task || endEvent?.detail?.task || "task"
    const status = endEvent ? (endEvent.event_type === "task_complete" ? "complete" : endEvent.event_type === "task_fail" ? "failed" : "stalled") : "running"
    const badge = statusBadge(status)

    return (
        <div className="border-b border-zinc-800/50 pb-4 last:border-0">
            <div className="flex items-start gap-3 text-sm">
                <Avatar className="h-8 w-8 border border-zinc-700 mt-0.5 shrink-0">
                    <AvatarImage src={getAgentAvatar(agent_id)} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">{agent.emoji}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{agent.name}</span>
                        {badge && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${badge.className}`}>
                                {badge.label}
                            </Badge>
                        )}
                        <span className="text-xs text-zinc-500 ml-auto shrink-0">
                            {timeAgo(events[0].created_at)}
                        </span>
                    </div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-left text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <span>{taskName}</span>
                        {commits.length > 0 && (
                            <span className="text-xs text-zinc-500 ml-2">
                                {expanded ? "▾" : "▸"} {commits.length} commit{commits.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </button>
                    {expanded && commits.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-zinc-500">
                            {commits.map((e) => (
                                <li key={e.id} className="flex gap-2">
                                    <code className="text-amber-400/70 font-mono">{e.detail?.hash || "?"}</code>
                                    <span className="truncate">{e.detail?.message || "?"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

function SingleEvent({ event }: { event: Event }) {
    const agent = getAgent(event.agent_id)
    const { text, status } = formatSingleEvent(event)
    const badge = statusBadge(status)

    return (
        <div className="flex items-start gap-3 text-sm border-b border-zinc-800/50 pb-4 last:border-0">
            <Avatar className="h-8 w-8 border border-zinc-700 mt-0.5 shrink-0">
                <AvatarImage src={getAgentAvatar(event.agent_id)} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">{agent.emoji}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{agent.name}</span>
                    {badge && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${badge.className}`}>
                            {badge.label}
                        </Badge>
                    )}
                    <span className="text-xs text-zinc-500 ml-auto shrink-0">
                        {timeAgo(event.created_at)}
                    </span>
                </div>
                <p className="text-zinc-400 break-words">{text}</p>
            </div>
        </div>
    )
}

export function ActivityFeed({ events }: ActivityFeedProps) {
    const grouped = groupEvents(events)

    return (
        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {grouped.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                            No recent activity yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {grouped.map((item) => {
                                switch (item.type) {
                                    case "commit_group":
                                        return <CommitGroup key={item.key} events={item.events} agent_id={item.agent_id} />
                                    case "task_group":
                                        return <TaskGroup key={item.key} events={item.events} agent_id={item.agent_id} />
                                    case "single":
                                    default:
                                        return <SingleEvent key={item.key} event={item.events[0]} />
                                }
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
