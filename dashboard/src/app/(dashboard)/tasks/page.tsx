"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Filter, RefreshCw, Plus } from "lucide-react";
import { KanbanColumn } from "@/components/kanban/column";
import { TaskDetailSheet } from "@/components/kanban/task-detail-sheet";
import { NewTaskSheet } from "@/components/kanban/new-task-sheet";
import { Project, QueueTask, FeatureRequest } from "@/components/kanban/types";

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

const COLUMNS: Array<{ title: string; status: string }> = [
    { title: "📥 Backlog", status: "backlog" },
    { title: "📋 Planned", status: "planned" },
    { title: "⚡ Running", status: "running" },
    { title: "🔄 Review", status: "review" },
    { title: "👤 Human Todos", status: "human_todo" },
    { title: "✅ Done", status: "done" },
];

// --- Main Page Component ---
export default function TasksPage() {
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string>("backlog");
  const [selectedItem, setSelectedItem] = useState<QueueTask | FeatureRequest | null>(null);
  const [isNewTaskSheetOpen, setIsNewTaskSheetOpen] = useState(false);

  const { data: queueData, isLoading: isQueueLoading, error: queueError, isFetching: isQueueFetching } = useQuery({
    queryKey: ["task-queue"],
    queryFn: fetchQueue,
    refetchInterval: 10_000,
  });

  const { data: backlogData, isLoading: isBacklogLoading, error: backlogError } = useQuery({
    queryKey: ["backlog"],
    queryFn: fetchBacklog,
    refetchInterval: 30_000,
  });

  const { data: projects = FALLBACK_PROJECTS } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  });

  // --- Data Processing ---
  const statusMapping: Record<string, string> = {
    queued: "backlog", assigned: "planned", planned: "planned",
    running: "running", review: "review", human_todo: "human_todo",
    done: "done", failed: "review", cancelled: "done",
  };

  const tasks = (queueData ?? []).map((t) => ({ ...t, status: statusMapping[t.status] || t.status }));
  const filteredTasks = projectFilter === "all" ? tasks : tasks.filter((t) => (t.project || "other") === projectFilter);
  const filteredBacklog = projectFilter === 'all' ? backlogData : backlogData?.filter(fr => (fr.project || 'other') === projectFilter);

  const actionMap: Record<string, string> = {
    backlog: "requeue", planned: "plan", running: "run",
    review: "review", human_todo: "human", done: "complete",
  };
  
  const handleCardClick = (item: QueueTask | FeatureRequest) => setSelectedItem(item);
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSelectedItem(null);
  };

  const isLoading = isQueueLoading || isBacklogLoading;
  const error = queueError || backlogError;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* --- Header --- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kanban Board</h1>
            <p className="text-xs text-muted-foreground/70 mt-1">Drag cards between columns to change their status.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
                onClick={() => setIsNewTaskSheetOpen(true)}
                className="flex items-center gap-1.5 text-xs text-foreground hover:text-foreground/80 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-lg px-3 py-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["task-queue"] });
                  queryClient.invalidateQueries({ queryKey: ["backlog"] });
                }}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="Refresh tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isQueueFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* --- Filters --- */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setProjectFilter("all")}
              className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                projectFilter === "all" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted/50 text-muted-foreground border-border hover:border-zinc-600"
              }`}
            >
              🌐 All Projects
            </button>
            {projects.map((p) => (
              <button key={p.id} onClick={() => setProjectFilter(p.id)}
                className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                  projectFilter === p.id ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted/50 text-muted-foreground border-border hover:border-zinc-600"
                }`}
              >
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        )}

        {/* --- Board --- */}
        {isLoading ? ( <p className="text-sm text-muted-foreground">Loading…</p> ) 
         : error ? ( <p className="text-sm text-red-400">Failed to load tasks.</p> ) 
         : (
          <>
            {/* Mobile: Tabs */}
            <div className="lg:hidden">
                <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-2">
                        {COLUMNS.map(c => {
                             const tasksInCol = filteredTasks.filter(t => t.status === c.status);
                             const frsInCol = c.status === 'backlog' ? filteredBacklog : [];
                             const count = tasksInCol.length + (frsInCol?.length || 0);
                             return (
                                <button key={c.status} onClick={() => setActiveColumn(c.status)}
                                    className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap px-4 py-2 rounded-lg ${activeColumn === c.status ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
                                    {c.title}
                                    <span className="text-xs bg-muted text-muted-foreground/80 rounded-full px-2">{count}</span>
                                </button>
                             )
                        })}
                    </div>
                </div>
                <KanbanColumn
                    key={activeColumn}
                    title={COLUMNS.find(c => c.status === activeColumn)?.title || ""}
                    status={activeColumn}
                    tasks={filteredTasks.filter((t) => t.status === activeColumn)}
                    featureRequests={activeColumn === 'backlog' ? filteredBacklog : []}
                    actionMap={actionMap}
                    projects={projects}
                    onCardClick={handleCardClick}
                    className="mt-2"
                />
            </div>

            {/* Desktop: Grid */}
            <div className="hidden lg:grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {COLUMNS.map((c) => (
                <KanbanColumn
                  key={c.status}
                  title={c.title}
                  status={c.status}
                  tasks={filteredTasks.filter((t) => t.status === c.status)}
                  featureRequests={c.status === 'backlog' ? filteredBacklog : []}
                  actionMap={actionMap}
                  projects={projects}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <TaskDetailSheet 
        isOpen={!!selectedItem}
        onOpenChange={handleSheetOpenChange}
        item={selectedItem}
        projects={projects}
      />
      <NewTaskSheet
        isOpen={isNewTaskSheetOpen}
        onOpenChange={setIsNewTaskSheetOpen}
        projects={projects}
      />
    </DndProvider>
  );
}
