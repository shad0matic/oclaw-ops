"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Play, Plus, Trash2, RotateCcw, CheckCircle2, XCircle, ListTodo } from "lucide-react"

const PROJECTS = ["all", "infra", "kdp", "boris", "taskbee", "crm"] as const
const AGENTS = [
    { id: "main", name: "Kevin 🍌" },
    { id: "nefario", name: "Dr. Nefario 🔬" },
    { id: "bob", name: "Bob 🎨" },
    { id: "xreader", name: "X Reader 📰" },
] as const

const STATUS_COLORS = {
    queued: "bg-zinc-500/10 text-zinc-400",
    assigned: "bg-blue-500/10 text-blue-400",
    running: "bg-yellow-500/10 text-yellow-400 animate-pulse",
    done: "bg-green-500/10 text-green-400",
    failed: "bg-red-500/10 text-red-400",
    cancelled: "bg-zinc-500/10 text-zinc-500 line-through",
} as const

const PRIORITY_COLORS = {
    high: "text-red-400",
    medium: "text-yellow-400",
    low: "text-zinc-400",
} as const

type Project = (typeof PROJECTS)[number]

type AgentId = (typeof AGENTS)[number]["id"]

type TaskStatus =
    | keyof typeof STATUS_COLORS
    | "planned"
    | "review"
    | "human_todo"
    | "stalled"

type TaskQueueItem = {
    id: number
    title: string
    description?: string | null
    project: string
    priority: number
    status: TaskStatus

    // API currently returns camelCase (agentId) but this UI references snake_case (agent_id).
    // Keep both optional to avoid changing runtime behavior.
    agentId?: string | null
    agent_id?: string | null
    agent_name?: string | null
}

type PriorityInfo = { label: "HIGH" | "MED" | "LOW"; color: string }

function priorityLabel(p: number): PriorityInfo {
    if (p >= 8) return { label: "HIGH", color: PRIORITY_COLORS.high }
    if (p >= 5) return { label: "MED", color: PRIORITY_COLORS.medium }
    return { label: "LOW", color: PRIORITY_COLORS.low }
}

type PatchAction = "assign" | "run" | "complete" | "fail" | "requeue"

export function TaskQueueClient() {
    const [tasks, setTasks] = useState<TaskQueueItem[]>([])
    const [filter, setFilter] = useState<Project>("all")
    const [showDone, setShowDone] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newProject, setNewProject] = useState<Exclude<Project, "all">>("infra")
    const [newAgent, setNewAgent] = useState<AgentId | "__none__">("__none__")
    const [newPriority, setNewPriority] = useState("5")

    const fetchTasks = useCallback(async (): Promise<void> => {
        const params = new URLSearchParams()
        if (filter !== "all") params.set("project", filter)
        const res = await fetch(`/api/tasks/queue?${params}`)
        if (res.ok) setTasks((await res.json()) as TaskQueueItem[])
    }, [filter])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    useEffect(() => {
        const i = setInterval(fetchTasks, 15_000)
        return () => clearInterval(i)
    }, [fetchTasks])

    const addTask = async (): Promise<void> => {
        if (!newTitle.trim()) return
        await fetch("/api/tasks/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: newTitle,
                project: newProject,
                agentId: newAgent === "__none__" ? null : newAgent,
                priority: parseInt(newPriority, 10),
            }),
        })
        setNewTitle("")
        fetchTasks()
    }

    const patchTask = async (
        id: number,
        action: PatchAction,
        extra: Record<string, unknown> = {},
    ): Promise<void> => {
        await fetch(`/api/tasks/queue/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...extra }),
        })
        fetchTasks()
    }

    const deleteTask = async (id: number): Promise<void> => {
        await fetch(`/api/tasks/queue/${id}`, { method: "DELETE" })
        fetchTasks()
    }

    const visible = tasks.filter(
        (t) => showDone || !["done", "failed", "cancelled"].includes(t.status),
    )

    return (
        <div className="space-y-6">
            {/* Add task form */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-zinc-400 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Task
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Input
                            placeholder="Task title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTask()}
                            className="flex-1 min-w-[200px] bg-zinc-950 border-zinc-800 text-white"
                        />
                        <Select
                            value={newProject}
                            onValueChange={(v) => setNewProject(v as Exclude<Project, "all">)}
                        >
                            <SelectTrigger className="w-[130px] bg-zinc-950 border-zinc-800 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                {PROJECTS.filter((p) => p !== "all").map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={newAgent}
                            onValueChange={(v) => setNewAgent(v as AgentId | "__none__")}
                        >
                            <SelectTrigger className="w-[170px] bg-zinc-950 border-zinc-800 text-white">
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="__none__">Unassigned</SelectItem>
                                {AGENTS.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={newPriority} onValueChange={setNewPriority}>
                            <SelectTrigger className="w-[80px] bg-zinc-950 border-zinc-800 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((p) => (
                                    <SelectItem key={p} value={p.toString()}>
                                        P{p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={addTask} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    {PROJECTS.map((p) => (
                        <Button
                            key={p}
                            variant={filter === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilter(p)}
                            className={
                                filter === p ? "bg-zinc-700" : "text-zinc-500 hover:text-white"
                            }
                        >
                            {p}
                        </Button>
                    ))}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDone(!showDone)}
                    className={showDone ? "text-green-400" : "text-zinc-500"}
                >
                    {showDone ? "Hide done" : "Show done"}
                </Button>
            </div>

            {/* Task list */}
            <div className="space-y-2">
                {visible.length === 0 && (
                    <div className="text-center text-zinc-500 py-8">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No tasks {filter !== "all" ? `for ${filter}` : ""}
                    </div>
                )}
                {visible.map((task) => {
                    const pri = priorityLabel(task.priority)
                    const agentId = task.agent_id ?? task.agentId ?? null
                    const agent = agentId ? AGENTS.find((a) => a.id === agentId) : undefined

                    return (
                        <Card
                            key={task.id}
                            className={`bg-zinc-900/50 border-zinc-800 ${
                                task.status === "running" ? "ring-1 ring-yellow-500/30" : ""
                            }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    {/* Priority */}
                                    <span className={`text-xs font-bold ${pri.color} w-8`}>{pri.label}</span>

                                    {/* Task info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium truncate">{task.title}</span>
                                            <Badge
                                                variant="outline"
                                                className="text-xs text-zinc-500 border-zinc-700"
                                            >
                                                {task.project}
                                            </Badge>
                                        </div>
                                        {task.description && (
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Agent */}
                                    <div className="text-sm text-zinc-400 w-[120px] text-right truncate">
                                        {agent ? (
                                            agent.name
                                        ) : (
                                            <Select
                                                value="__none__"
                                                onValueChange={(v) =>
                                                    v !== "__none__" &&
                                                    patchTask(task.id, "assign", { agentId: v })
                                                }
                                            >
                                                <SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-800">
                                                    <SelectValue placeholder="Assign..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    <SelectItem value="__none__">Unassigned</SelectItem>
                                                    {AGENTS.map((a) => (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <Badge
                                        className={`${
                                            STATUS_COLORS[task.status as keyof typeof STATUS_COLORS] ||
                                            STATUS_COLORS.queued
                                        } text-xs w-[80px] justify-center`}
                                    >
                                        {task.status}
                                    </Badge>

                                    {/* Actions */}
                                    <div className="flex gap-1">
                                        {(task.status === "queued" || task.status === "assigned") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-green-500 hover:text-green-400"
                                                onClick={() => patchTask(task.id, "run")}
                                                title="Run"
                                            >
                                                <Play className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {task.status === "running" && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-green-500 hover:text-green-400"
                                                    onClick={() => patchTask(task.id, "complete")}
                                                    title="Mark done"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-400"
                                                    onClick={() =>
                                                        patchTask(task.id, "fail", {
                                                            result: "manually failed",
                                                        })
                                                    }
                                                    title="Mark failed"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                        {[
                                            "done",
                                            "failed",
                                            "cancelled",
                                            "stalled",
                                        ].includes(task.status) && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-blue-500 hover:text-blue-400"
                                                onClick={() => patchTask(task.id, "requeue")}
                                                title="Requeue"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-zinc-500 hover:text-red-400"
                                            onClick={() => deleteTask(task.id)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
