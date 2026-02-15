"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { PageHeader } from "@/components/layout/page-header"
import { AgentAvatar } from "@/components/ui/agent-avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"

interface ArchivedTask {
  id: number
  title: string
  project: string
  agent_id: string | null
  agent_name: string | null
  status: string
  priority: number
  completed_at: string | null
  created_at: string
  description: string | null
}

const fetchArchive = async (page: number, search: string, project: string): Promise<{ tasks: ArchivedTask[]; total: number }> => {
  const params = new URLSearchParams({ page: String(page), limit: "30" })
  if (search) params.set("search", search)
  if (project !== "all") params.set("project", project)
  const res = await fetch(`/api/tasks/archive?${params}`)
  if (!res.ok) throw new Error("Failed to fetch archive")
  return res.json()
}

export function ArchiveClient() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [project, setProject] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["task-archive", page, search, project],
    queryFn: () => fetchArchive(page, search, project),
  })

  const { data: projects = [] } = useQuery<{ id: string; label: string; icon: string }[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  })

  const tasks = data?.tasks || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 30)

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }) } catch { return "—" }
  }

  const statusColor: Record<string, string> = {
    done: "bg-green-500/10 text-green-500",
    failed: "bg-red-500/10 text-red-500",
    cancelled: "bg-zinc-500/10 text-zinc-400",
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Link href="/tasks" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="📦 Task Archive" subtitle={`${total} completed tasks`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={project}
          onChange={(e) => { setProject(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-muted rounded-lg border border-border"
        >
          <option value="all">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors">
              {task.agent_id && <AgentAvatar agentId={task.agent_id} size={28} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground/50">#{task.id}</span>
                  <span className="text-sm font-medium truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{projects.find(p => p.id === task.project)?.icon || "📦"} {task.project}</span>
                  <span>Completed {formatDate(task.completed_at)}</span>
                  {task.agent_name && <span>by {task.agent_name}</span>}
                </div>
              </div>
              <Badge className={`text-[10px] ${statusColor[task.status] || statusColor.done}`}>
                {task.status}
              </Badge>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">No archived tasks found.</div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded border border-border disabled:opacity-30 hover:bg-muted"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded border border-border disabled:opacity-30 hover:bg-muted"
          >
            Next →
          </button>
        </div>
      )}
    </>
  )
}
