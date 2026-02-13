"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRef, useState } from "react";
import { Filter, ChevronDown, ChevronUp, Plus, RefreshCw } from "lucide-react";

const ItemTypes = { CARD: "card" } as const;

interface Project {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
}

type QueueStatus = "backlog" | "planned" | "running" | "review" | "human_todo" | "done";

interface QueueTask {
  id: number;
  title: string;
  description: string | null;
  project: string;
  agent_id: string | null;
  agent_name?: string | null;
  priority: number;
  status: QueueStatus | string;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  review_count: number;
  reviewer_id: string | null;
  review_feedback: string | null;
}

// Priority color mapping: P1 (red/urgent) → P9 (grey/low)
function getPriorityColor(p: number): { dot: string; text: string; bg: string } {
  if (p <= 1) return { dot: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" };
  if (p <= 2) return { dot: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-500/10" };
  if (p <= 3) return { dot: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" };
  if (p <= 4) return { dot: "bg-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" };
  if (p <= 5) return { dot: "bg-lime-500", text: "text-lime-400", bg: "bg-lime-500/10" };
  if (p <= 6) return { dot: "bg-green-500", text: "text-green-400", bg: "bg-green-500/10" };
  if (p <= 7) return { dot: "bg-teal-500", text: "text-teal-400", bg: "bg-teal-500/10" };
  if (p <= 8) return { dot: "bg-zinc-400", text: "text-muted-foreground", bg: "bg-zinc-500/10" };
  return { dot: "bg-zinc-600", text: "text-muted-foreground/70", bg: "bg-zinc-600/10" };
}

// Fallback projects (used while DB loads)
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

function TaskCard({ task, projects }: { task: QueueTask; projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pc = getPriorityColor(task.priority);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, action, payload }: { id: number; action: string; payload?: any }) => {
      const res = await fetch(`/api/tasks/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      setFeedback(""); // Clear feedback on success
    },
  });


  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.CARD,
      item: { id: task.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id]
  );

  drag(ref);

  const proj = projects.find(p => p.id === (task.project || "other"));
  const projectIcon = proj?.icon || "📦";
  const projectColor = proj?.color || "border-l-zinc-500";
  
  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      mutation.mutate({ id: task.id, action: "reject", payload: { reviewFeedback: feedback } });
    }
  };


  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`rounded-lg border border-border bg-background/50 p-3 cursor-grab active:cursor-grabbing border-l-2 ${projectColor}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug flex-1">{task.title}</h3>
          <div className="flex items-center gap-1">
             {task.status === 'review' && task.review_count >= 2 && (
              <span className="text-[10px] font-mono shrink-0 text-purple-400 bg-purple-500/10 rounded px-1.5 py-0.5">
                🔄 x{task.review_count}
              </span>
            )}
            <span className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${pc.text} ${pc.bg} rounded px-1.5 py-0.5`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              P{task.priority}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span>{projectIcon}</span>
            <span className="font-medium text-foreground/80">{proj?.label || task.project}</span>
          </div>
          <div className="flex items-center">
            {task.agent_id && (
              <div className="flex items-center gap-1.5 mr-2">
                <img
                  src={`/assets/minion-avatars/${task.agent_id}.webp`}
                  alt={task.agent_name || task.agent_id}
                  className="w-4 h-4 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-muted-foreground">{task.agent_name || task.agent_id}</span>
              </div>
            )}
            {task.description && (
              <button className="text-muted-foreground/50 hover:text-muted-foreground">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        
        {task.status === 'review' && (
          <div className="mt-2 text-[11px] space-y-1">
            {task.reviewer_id && (
              <p className="text-muted-foreground/80">
                Review by: <span className="font-semibold">{task.reviewer_id}</span>
              </p>
            )}
            {task.review_feedback && (
              <p className="text-muted-foreground italic">
                &ldquo;{task.review_feedback.substring(0, 60)}{task.review_feedback.length > 60 ? '...' : ''}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
      
      {expanded && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
            <span>{task.agent_name || task.agent_id || "Unassigned"}</span>
            {task.created_at && <span>{new Date(task.created_at).toLocaleDateString('fr-FR')}</span>}
          </div>
        </div>
      )}

      {/* --- Action Buttons --- */}
      <div className="mt-2 pt-2 border-t border-border/50">
        {task.status === 'review' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => mutation.mutate({ id: task.id, action: "approve" })}
                className="flex-1 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded px-2 py-1 transition-colors"
              >
                ✅ Approve
              </button>
              <button 
                onClick={() => setFeedback(prev => prev ? "" : " ")} // Toggle feedback input
                className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded px-2 py-1 transition-colors"
              >
                🔄 Return
              </button>
            </div>
            {feedback && (
               <div className="flex items-center gap-1.5">
                 <input
                   type="text"
                   value={feedback}
                   onChange={(e) => setFeedback(e.target.value)}
                   placeholder="Add feedback..."
                   className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 />
                 <button onClick={handleFeedbackSubmit} className="text-xs bg-amber-500/20 text-amber-400 rounded px-2 py-1">Send</button>
              </div>
            )}
          </div>
        )}

        {task.status === 'human_todo' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => mutation.mutate({ id: task.id, action: "complete" })}
              className="flex-1 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded px-2 py-1 transition-colors"
            >
              ✅ Done
            </button>
            <button 
              onClick={() => mutation.mutate({ id: task.id, action: "reject" })}
              className="flex-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded px-2 py-1 transition-colors"
            >
              ❌ Reject
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Column({
  title,
  status,
  tasks,
  actionMap,
  projects,
  isInitiallyCollapsed,
}: {
  title: string;
  status: string;
  tasks: QueueTask[];
  actionMap: Record<string, string>;
  projects: Project[];
  isInitiallyCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(isInitiallyCollapsed);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, to }: { id: number; to: string }) => {
        const res = await fetch(`/api/tasks/queue/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: to }),
        });
        if (!res.ok) throw new Error("Failed to update task");
        return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-queue"] }),
  });

  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.CARD,
      drop: (item: { id: number }) => {
        const action = actionMap[status];
        if (action) mutation.mutate({ id: item.id, to: action });
      },
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [mutation, status, actionMap]
  );

  drop(ref);

  // Column header color based on status
  const headerColors: Record<string, string> = {
    backlog: "text-muted-foreground",
    planned: "text-blue-400",
    running: "text-amber-400",
    review: "text-purple-400",
    human_todo: "text-orange-400",
    done: "text-green-400",
  };

  return (
    <div
      ref={ref}
      className={`rounded-xl border p-3 bg-card/30 border-border min-h-[50vh] transition-all duration-300 ${
        isOver ? "bg-card/60 border-zinc-600" : ""
      } ${isCollapsed ? "min-h-0" : "min-h-[50vh]"}`}
    >
      <div
        className="mb-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className={`text-sm font-medium ${headerColors[status] || "text-foreground/80"}`}>{title}</h2>
        <span className="text-xs text-muted-foreground/70 bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      {!isCollapsed && (
        <div className="space-y-2">
          <AnimatePresence>
            {tasks
              .sort((a, b) => a.priority - b.priority)
              .map((t) => (
                <TaskCard key={t.id} task={t} projects={projects} />
              ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["task-queue"],
    queryFn: fetchQueue,
    refetchInterval: 10_000,
  });

  const { data: projects = FALLBACK_PROJECTS } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  });

  // Map DB statuses to kanban columns
  const statusMapping: Record<string, string> = {
    queued: "backlog",
    assigned: "planned",
    planned: "planned",
    running: "running",
    review: "review",
    human_todo: "human_todo",
    done: "done",
    failed: "review",
    cancelled: "done",
  };

  const tasks = (data ?? []).map((t) => ({
    ...t,
    status: statusMapping[t.status] || t.status,
  }));

  const filteredTasks =
    projectFilter === "all"
      ? tasks
      : tasks.filter((t) => (t.project || "other") === projectFilter);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  // Action map: status → API action name
  const actionMap: Record<string, string> = {
    backlog: "requeue",
    planned: "plan",
    running: "run",
    review: "review",
    human_todo: "human",
    done: "complete",
  };

  const columns: Array<{ title: string; status: string }> = [
    { title: "📥 Backlog", status: "backlog" },
    { title: "📋 Planned", status: "planned" },
    { title: "⚡ Running", status: "running" },
    { title: "🔄 Review", status: "review" },
    { title: "👤 Human Todos", status: "human_todo" },
    { title: "✅ Done", status: "done" },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kanban Board</h1>
            <p className="text-xs text-muted-foreground/70 mt-1">Operations flow: Backlog → Planned → Running → Review → Human Todos → Done</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-lg px-3 py-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground/50">Auto-refresh: 10s</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["task-queue"] })}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="Refresh tasks"
                >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setProjectFilter("all")}
              className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                projectFilter === "all"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-zinc-600"
              }`}
            >
              🌐 All Projects
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjectFilter(p.id)}
                className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                  projectFilter === p.id
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-zinc-600"
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">Failed to load tasks.</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {columns.map((c) => (
              <Column
                key={c.status}
                title={c.title}
                status={c.status}
                tasks={filteredTasks.filter((t) => t.status === c.status)}
                actionMap={actionMap}
                projects={projects}
                isInitiallyCollapsed={c.status === 'done' && !tasks.some(t => t.status === 'running')}
              />
            ))}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
