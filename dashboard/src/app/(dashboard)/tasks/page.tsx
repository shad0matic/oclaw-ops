"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRef, useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

const ItemTypes = { CARD: "card" } as const;

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
  if (p <= 8) return { dot: "bg-zinc-400", text: "text-zinc-400", bg: "bg-zinc-500/10" };
  return { dot: "bg-zinc-600", text: "text-zinc-500", bg: "bg-zinc-600/10" };
}

// Project icons/labels
const PROJECT_OPTIONS = [
  { key: "all", label: "All Projects", icon: "🌐" },
  { key: "minions-control", label: "Minions Control", icon: "🎛️" },
  { key: "openclaw", label: "OpenClaw/Kevin", icon: "🦞" },
  { key: "teen-founder", label: "Teen Founder", icon: "🚀" },
  { key: "openpeople-crm", label: "OpenPeople-CRM", icon: "👥" },
  { key: "other", label: "Other", icon: "📦" },
];

async function fetchQueue(): Promise<QueueTask[]> {
  const res = await fetch("/api/tasks/queue");
  if (!res.ok) throw new Error("Failed to fetch task queue");
  return res.json();
}

async function transitionTask({ id, to }: { id: number; to: string }) {
  const res = await fetch(`/api/tasks/queue/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: to }),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

function TaskCard({ task }: { task: QueueTask }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const pc = getPriorityColor(task.priority);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.CARD,
      item: { id: task.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id]
  );

  drag(ref);

  const projectIcon = PROJECT_OPTIONS.find(
    (p) => p.key === (task.project || "other")
  )?.icon || "📦";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug flex-1">{task.title}</h3>
        <span className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${pc.text} ${pc.bg} rounded px-1.5 py-0.5`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          P{task.priority}
        </span>
      </div>
      {task.description && (
        <div className="mt-1">
          <p
            className={`text-xs text-zinc-400 ${expanded ? "" : "line-clamp-2"} cursor-pointer`}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {task.description}
          </p>
          {task.description.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-0.5 flex items-center gap-0.5"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
            </button>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{projectIcon} {task.project || "other"}</span>
        <span>{task.agent_name || task.agent_id || "Unassigned"}</span>
      </div>
    </motion.div>
  );
}

function Column({
  title,
  status,
  tasks,
  actionMap,
}: {
  title: string;
  status: string;
  tasks: QueueTask[];
  actionMap: Record<string, string>;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: transitionTask,
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
    backlog: "text-zinc-400",
    planned: "text-blue-400",
    running: "text-amber-400",
    review: "text-purple-400",
    human_todo: "text-orange-400",
    done: "text-green-400",
  };

  return (
    <div
      ref={ref}
      className={`rounded-xl border p-3 bg-zinc-900/30 border-zinc-800 min-h-[50vh] transition-colors ${
        isOver ? "bg-zinc-900/60 border-zinc-600" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`text-sm font-medium ${headerColors[status] || "text-zinc-300"}`}>{title}</h2>
        <span className="text-xs text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {tasks
            .sort((a, b) => a.priority - b.priority)
            .map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [projectFilter, setProjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["task-queue"],
    queryFn: fetchQueue,
    refetchInterval: 10_000,
  });

  // Map old statuses to new flow
  const statusMapping: Record<string, string> = {
    queued: "backlog",
    running: "running",
    done: "done",
    failed: "review",
  };

  const tasks = (data ?? []).map((t) => ({
    ...t,
    status: statusMapping[t.status] || t.status,
  }));

  const filteredTasks =
    projectFilter === "all"
      ? tasks
      : tasks.filter((t) => (t.project || "other") === projectFilter);

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
            <h1 className="text-2xl font-semibold text-white">Kanban Board</h1>
            <p className="text-xs text-zinc-500 mt-1">Operations flow: Backlog → Planned → Running → Review → Human Todos → Done</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <p className="text-xs text-zinc-600">Auto-refresh: 10s</p>
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            {PROJECT_OPTIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => setProjectFilter(p.key)}
                className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors border ${
                  projectFilter === p.key
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
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
              />
            ))}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
