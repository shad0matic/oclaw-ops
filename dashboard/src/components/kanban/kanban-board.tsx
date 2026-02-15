
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Filter, RefreshCw, Plus, Search, Archive } from "lucide-react";
import Link from "next/link";
import { KanbanColumn } from "@/components/kanban/column";
import { TaskDetailSheet } from "@/components/kanban/task-detail-sheet";
import { NewTaskSheet } from "@/components/kanban/new-task-sheet";
import { Project, QueueTask, FeatureRequest } from "@/components/kanban/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useTaskStream } from "@/hooks/use-task-stream";

const REFRESH_INTERVAL = 10_000; // 10s

// --- Countdown refresh ring ---
function RefreshCountdown({ isFetching, onRefresh }: { isFetching: boolean; onRefresh: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isFetching) { setProgress(0); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / REFRESH_INTERVAL, 1));
    };
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [isFetching]);

  const r = 7, c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <button
      onClick={onRefresh}
      className="relative w-7 h-7 flex items-center justify-center group"
      aria-label={`Refresh tasks (${Math.round((1 - progress) * 10)}s)`}
      title={`Next refresh in ${Math.round((1 - progress) * 10)}s`}
    >
      <svg className="absolute inset-0 w-7 h-7 -rotate-90" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-muted-foreground/15" />
        <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="text-amber-500/60 transition-[stroke-dashoffset] duration-100" />
      </svg>
      <RefreshCw className={`w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors ${isFetching ? "animate-spin" : ""}`} />
    </button>
  );
}

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


export function KanbanBoard() {
  const queryClient = useQueryClient();
  useTaskStream(); // Real-time SSE updates
  const [projectFilter, setProjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string>("backlog");
  const [isDoneExpanded, setIsDoneExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueTask | FeatureRequest | null>(null);
  const [isNewTaskSheetOpen, setIsNewTaskSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);

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

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });

  const statusMapping: Record<string, string> = {
    queued: "backlog", assigned: "planned", planned: "planned",
    running: "running", review: "review", human_todo: "human_todo",
    done: "done", failed: "review", cancelled: "done",
  };

  const tasks = (queueData ?? []).map((t) => ({ ...t, status: statusMapping[t.status] || t.status }));
  
  const filteredTasks = useMemo(() => {
    let tasksToFilter = tasks;
    if (projectFilter !== "all") {
      tasksToFilter = tasksToFilter.filter((t) => (t.project || "other") === projectFilter);
    }
    if (agentFilter.length > 0) {
      tasksToFilter = tasksToFilter.filter(t => t.agent_id && agentFilter.includes(t.agent_id));
    }
    if (debouncedSearchQuery) {
      tasksToFilter = tasksToFilter.filter(t => t.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    }
    return tasksToFilter;
  }, [tasks, projectFilter, agentFilter, debouncedSearchQuery]);

  const filteredBacklog = useMemo(() => {
    let projectFiltered = projectFilter === 'all' ? backlogData : backlogData?.filter(fr => (fr.project || 'other') === projectFilter);
    if (debouncedSearchQuery && projectFiltered) {
      return projectFiltered.filter(fr => fr.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    }
    return projectFiltered;
  }, [backlogData, projectFilter, debouncedSearchQuery]);

  const actionMap: Record<string, string> = {
    backlog: "requeue", planned: "plan", running: "run",
    review: "review", human_todo: "human", done: "complete",
  };
  
  const DONE_LIMIT = 10;

  const getColumnTasks = (status: string) => {
    let tasksInColumn = filteredTasks.filter((t) => t.status === status);
    if (status === 'done') {
      // Sort by completed_at desc (most recent first)
      tasksInColumn = [...tasksInColumn].sort((a, b) => {
        const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bDate - aDate;
      });
    }
    return tasksInColumn;
  };

  const handleCardClick = (item: QueueTask | FeatureRequest) => setSelectedItem(item);
  const handleSheetOpenChange = (isOpen: boolean) => !isOpen && setSelectedItem(null);

  const isLoading = isQueueLoading || isBacklogLoading;
  const error = queueError || backlogError;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
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
            <RefreshCountdown
              isFetching={isQueueFetching}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ["task-queue"] });
                queryClient.invalidateQueries({ queryKey: ["backlog"] });
              }}
            />
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap items-center">
             <span className="text-xs text-muted-foreground mr-2">Projects:</span>
            <button
              onClick={() => setProjectFilter("all")}
              className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                projectFilter === "all" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted/50 text-muted-foreground border-border hover:border-zinc-600"
              }`}
            >
              🌐 All
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
            <div className="border-l h-5 border-border mx-2"></div>
            <span className="text-xs text-muted-foreground mr-2">Agents:</span>
            {agents.map((a) => (
              <button key={a.id} onClick={() => {
                setAgentFilter(prev => 
                  prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                );
              }}
                className={`flex items-center gap-1.5 text-xs rounded-full p-0.5 transition-colors border ${
                  agentFilter.includes(a.id) ? "border-amber-500/30" : "border-transparent"
                }`}
              >
                <img src={`/assets/minion-avatars/${a.id}.webp`} alt={a.name} className="w-6 h-6 rounded-full" />
              </button>
            ))}
          </div>
        )}

        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> 
         : error ? <p className="text-sm text-red-400">Failed to load tasks.</p> 
         : (
          <>
            <div className="lg:hidden space-y-3">
              {/* Mobile: tab-based column switcher */}
              <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {COLUMNS.map((c) => {
                  const count = c.status === 'backlog'
                    ? filteredTasks.filter(t => t.status === c.status).length + (filteredBacklog?.length || 0)
                    : filteredTasks.filter(t => t.status === c.status).length;
                  return (
                    <button
                      key={c.status}
                      onClick={() => setActiveColumn(c.status)}
                      className={`flex-shrink-0 text-xs px-3 py-2 rounded-lg transition-colors ${
                        activeColumn === c.status
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {c.title.split(" ")[0]} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                    </button>
                  );
                })}
              </div>
              {COLUMNS.filter(c => c.status === activeColumn).map((c) => {
                const allTasks = getColumnTasks(c.status);
                const displayTasks = c.status === 'done' && !isDoneExpanded ? allTasks.slice(0, DONE_LIMIT) : allTasks;
                return (
                  <div key={c.status}>
                    <KanbanColumn
                      title={c.title}
                      status={c.status}
                      tasks={displayTasks}
                      totalTasks={allTasks.length}
                      featureRequests={c.status === 'backlog' ? filteredBacklog : []}
                      actionMap={actionMap}
                      projects={projects}
                      onCardClick={handleCardClick}
                    />
                    {c.status === 'done' && allTasks.length > DONE_LIMIT && (
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <button onClick={() => setIsDoneExpanded(!isDoneExpanded)} className="text-xs text-muted-foreground hover:text-foreground">
                          {isDoneExpanded ? "Show less" : `Show ${DONE_LIMIT} of ${allTasks.length}`}
                        </button>
                        <Link href="/tasks/archive" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Archive className="w-3 h-3" /> View archive
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden lg:grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {COLUMNS.map((c) => {
                const allTasks = getColumnTasks(c.status);
                const displayTasks = c.status === 'done' && !isDoneExpanded ? allTasks.slice(0, DONE_LIMIT) : allTasks;
                return (
                  <div key={c.status}>
                    <KanbanColumn
                      title={c.title}
                      status={c.status}
                      tasks={displayTasks}
                      totalTasks={allTasks.length}
                      featureRequests={c.status === 'backlog' ? filteredBacklog : []}
                      actionMap={actionMap}
                      projects={projects}
                      onCardClick={handleCardClick}
                    />
                    {c.status === 'done' && allTasks.length > DONE_LIMIT && (
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <button onClick={() => setIsDoneExpanded(!isDoneExpanded)} className="text-xs text-muted-foreground hover:text-foreground">
                          {isDoneExpanded ? "Show less" : `Show ${DONE_LIMIT} of ${allTasks.length}`}
                        </button>
                        <Link href="/tasks/archive" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Archive className="w-3 h-3" /> View archive
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
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
