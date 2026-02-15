"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Filter, RefreshCw, Plus, Search } from "lucide-react";
import { KanbanColumn } from "@/components/kanban/column";
import { TaskDetailSheet } from "@/components/kanban/task-detail-sheet";
import { NewTaskSheet } from "@/components/kanban/new-task-sheet";
import { Project, QueueTask, FeatureRequest } from "@/components/kanban/types";
import { useDebounce } from "@/hooks/use-debounce";

// --- Data Fetching ---
const FALLBACK_PROJECTS: Project[] = [
  { id: "oclaw-ops", label: "Minions Control", icon: "🎛️", color: "border-l-amber-500" },
  { id: "other", label: "Other", icon: "📦", color: "border-l-zinc-500" },
];

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) return FALLBACK_PROJECTS;
  return res.json();
}

async function fetchQueue(): Promise<QueueTask[]> {
  const res = await fetch("/api/tasks/queue");
  if (!res.ok) throw new Error("Failed to fetch task queue");
  return res.json();
}

async function fetchBacklog(): Promise<FeatureRequest[]> {
  const res = await fetch("/api/tasks/backlog");
  if (!res.ok) throw new Error("Failed to fetch backlog");
  return res.json();
}

async function fetchAgents(): Promise<{ id: string; name: string; agent_id: string }[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) return [];
  const data = await res.json();
  // Normalize: API returns agent_id as the string identifier, id as numeric PK
  return (Array.isArray(data) ? data : []).map((a: any) => ({ ...a, id: a.agent_id || a.id }));
}

const COLUMNS: Array<{ title: string; status: string }> = [
    { title: "📥 Backlog", status: "backlog" },
    { title: "📋 Planned", status: "planned" },
    { title: "⚡ Running", status: "running" },
    { title: "🔄 Review", status: "review" },
    { title: "👤 Human Todos", status: "human_todo" },
    { title: "✅ Done", status: "done" },
];

import { ProjectsClient } from "./projects/projects-client";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PageHeader } from "@/components/layout/page-header";

// --- Main Page Component ---
export default function TasksPage() {
    const [view, setView] = useState<"kanban" | "projects">("kanban");

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <PageHeader 
                    title={view === 'kanban' ? "Tasks" : "Projects"}
                    subtitle={view === 'kanban' ? "Manage the task queue and backlog." : "Track long-running epics."}
                />
                <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
                    <button 
                        onClick={() => setView('kanban')}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${view === 'kanban' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                    >
                        Kanban
                    </button>
                    <button 
                        onClick={() => setView('projects')}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${view === 'projects' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                    >
                        Projects
                    </button>
                </div>
            </div>

            {view === 'kanban' ? (
                <KanbanBoard />
            ) : (
                <ProjectsClient />
            )}
        </div>
    )
}

