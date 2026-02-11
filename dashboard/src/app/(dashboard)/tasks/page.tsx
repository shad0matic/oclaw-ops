"use client";

import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRef } from "react";

const ItemTypes = { CARD: "card" } as const;

type QueueStatus = "queued" | "running" | "done" | "failed";

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

async function fetchQueue(): Promise<QueueTask[]> {
  const res = await fetch("/api/tasks/queue");
  if (!res.ok) throw new Error("Failed to fetch task queue");
  return res.json();
}

async function transitionTask({ id, to }: { id: number; to: QueueStatus }) {
  const actionByStatus: Record<QueueStatus, string> = {
    queued: "requeue",
    running: "run",
    done: "complete",
    failed: "fail",
  };

  const res = await fetch(`/api/tasks/queue/${id}` as const, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: actionByStatus[to] }),
  });

  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

function TaskCard({ task }: { task: QueueTask }) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.CARD,
      item: { id: task.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id]
  );

  drag(ref);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
      style={{ opacity: isDragging ? 0.6 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug">{task.title}</h3>
        <span className="text-[10px] text-zinc-500 font-mono">P{task.priority}</span>
      </div>
      {task.description ? (
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{task.description}</p>
      ) : null}
      <div className="mt-2 text-[11px] text-zinc-500">
        {task.agent_name ? `Agent: ${task.agent_name}` : task.agent_id ? `Agent: ${task.agent_id}` : "Unassigned"}
      </div>
    </motion.div>
  );
}

function Column({
  title,
  status,
  tasks,
}: {
  title: string;
  status: QueueStatus;
  tasks: QueueTask[];
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
      drop: (item: { id: number }) => mutation.mutate({ id: item.id, to: status }),
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [mutation, status]
  );

  drop(ref);

  return (
    <div
      ref={ref}
      className={`rounded-xl border p-3 bg-zinc-900/30 border-zinc-800 min-h-[60vh] transition-colors ${
        isOver ? "bg-zinc-900/60" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
        <span className="text-xs text-zinc-500">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["task-queue"],
    queryFn: fetchQueue,
    refetchInterval: 10_000,
  });

  const tasks = data ?? [];

  const columns: Array<{ title: string; status: QueueStatus }> = [
    { title: "Queued", status: "queued" },
    { title: "Running", status: "running" },
    { title: "Done", status: "done" },
    { title: "Failed", status: "failed" },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-xs text-zinc-500">Auto-refresh: 10s</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">Failed to load tasks.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {columns.map((c) => (
              <Column
                key={c.status}
                title={c.title}
                status={c.status}
                tasks={tasks.filter((t) => t.status === c.status)}
              />
            ))}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
