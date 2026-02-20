"use client"

import { AgentEntity } from "@/entities/agent";

import { useRef, useState, useMemo } from "react";
import { useDrop } from "react-dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CompactTaskCard } from "./compact-card";
import { CompactFrCard } from "./compact-fr-card";
import { ItemTypes } from "./item-types";
import { QueueTask, FeatureRequest, Project } from "./types";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ColumnProps {
  title: string;
  status: string;
  tasks: QueueTask[];
  featureRequests?: FeatureRequest[];
  actionMap: Record<string, string>;
  projects: Project[];
  onCardClick: (item: QueueTask | FeatureRequest) => void;
  className?: string;
  totalTasks?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function KanbanColumn({
  title,
  status,
  tasks,
  featureRequests,
  actionMap,
  projects,
  onCardClick,
  className,
  totalTasks,
  isExpanded,
  onToggleExpand,
}: ColumnProps) {
  const qc = useQueryClient();

  const taskMutation = useMutation({
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

  const frMutation = useMutation({
    mutationFn: async (fr: FeatureRequest) => {
      const priorityMap: Record<string, number> = { high: 2, medium: 5, low: 8 };
      const payload = {
        title: fr.title,
        description: fr.description,
        project: fr.project,
        priority: priorityMap[fr.priority] || 8,
        status: 'planned'
      };
      const res = await fetch('/api/tasks/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create task from feature request");
      // Mark the file as planned so it disappears from backlog
      await fetch('/api/tasks/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fr.filename, status: 'planned' })
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      qc.invalidateQueries({ queryKey: ["backlog"] });
    }
  });

  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.DB_TASK_CARD, ItemTypes.FR_CARD],
      drop: (item: { id: number } | FeatureRequest, monitor) => {
        const itemType = monitor.getItemType();
        const action = actionMap[status];

        if (itemType === ItemTypes.DB_TASK_CARD && 'id' in item && typeof item.id === 'number') {
           if (action) taskMutation.mutate({ id: item.id, to: action });
        } else if (itemType === ItemTypes.FR_CARD && 'filename' in item) {
          if (status === 'planned') {
            frMutation.mutate(item as FeatureRequest);
          }
        }
      },
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [taskMutation, frMutation, status, actionMap]
  );

  drop(ref);

  const totalItems = tasks.length + (featureRequests?.length || 0);

  const statusColorClass = {
    backlog: "border-t-zinc-500",
    planned: "border-t-blue-500",
    running: "border-t-amber-500",
    review: "border-t-purple-500",
    human_todo: "border-t-orange-500",
    done: "border-t-green-500",
  }[status] || "border-t-transparent";

  return (
    <div
      ref={ref}
      className={`rounded-xl border p-3 bg-card/30 border-border min-h-[50vh] transition-colors duration-200 border-t-4 ${statusColorClass} ${
        isOver ? "bg-card/60 border-zinc-600" : ""
      } ${className}`}
    >
      <div className="hidden lg:flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground/70 bg-muted rounded-full px-2 py-0.5">{totalItems}</span>
      </div>
      <div className="space-y-2">
        {status === 'done' ? (
          <DoneTreeView tasks={tasks} projects={projects} onCardClick={onCardClick} />
        ) : (
          <AnimatePresence>
            {(() => {
              const priorityMap: Record<string, number> = { high: 2, medium: 5, low: 8 };
              const allItems: Array<{ type: 'fr' | 'task'; priority: number; item: any }> = [
                ...(featureRequests || []).map(fr => ({
                  type: 'fr' as const,
                  priority: priorityMap[fr.priority] || 8,
                  item: fr,
                })),
                ...tasks.map(t => ({
                  type: 'task' as const,
                  priority: t.priority,
                  item: t,
                })),
              ];
              allItems.sort((a, b) => a.priority - b.priority);
              return allItems.map(({ type, item }) =>
                type === 'fr'
                  ? <CompactFrCard key={item.id} fr={item} projects={projects} onClick={() => onCardClick(item)} />
                  : <CompactTaskCard key={item.id} task={item} projects={projects} onClick={() => onCardClick(item)} />
              );
            })()}
          </AnimatePresence>
        )}
      </div>
      {status === 'done' && onToggleExpand && totalTasks && totalTasks > 5 && (
        <div className="mt-2 text-center">
          <button onClick={onToggleExpand} className="text-xs text-muted-foreground hover:text-foreground">
            {isExpanded ? "Show less" : `Show all (${totalTasks})`}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Done column: tasks grouped by agent in a collapsible tree ---

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface AgentGroup {
  agentId: string;
  agentName: string;
  tasks: QueueTask[];
  latestCompleted: string | null;
}

function DoneTreeView({
  tasks,
  projects,
  onCardClick,
}: {
  tasks: QueueTask[];
  projects: Project[];
  onCardClick: (item: QueueTask) => void;
}) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, AgentGroup>();
    for (const t of tasks) {
      const key = t.agent_id || "_unassigned";
      if (!map.has(key)) {
        map.set(key, {
          agentId: t.agent_id || "",
          agentName: t.agent_name || t.agent_id || "Unassigned",
          tasks: [],
          latestCompleted: null,
        });
      }
      const g = map.get(key)!;
      g.tasks.push(t);
      if (t.completed_at && (!g.latestCompleted || t.completed_at > g.latestCompleted)) {
        g.latestCompleted = t.completed_at;
      }
    }
    // Sort groups by most recent completion
    return [...map.values()].sort((a, b) => {
      const aT = a.latestCompleted ? new Date(a.latestCompleted).getTime() : 0;
      const bT = b.latestCompleted ? new Date(b.latestCompleted).getTime() : 0;
      return bT - aT;
    });
  }, [tasks]);

  const toggle = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      next.has(agentId) ? next.delete(agentId) : next.add(agentId);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      {groups.map((g) => {
        const isExpanded = expandedAgents.has(g.agentId || "_unassigned");
        const key = g.agentId || "_unassigned";
        return (
          <div key={key} className="rounded-md border border-border/50 bg-card/20 overflow-hidden">
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-card/40 transition-colors"
            >
              {isExpanded
                ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              }
              {g.agentId && (
                <img
                  src={AgentEntity.avatarUrl(g.agentId)}
                  alt={g.agentName}
                  className="w-4 h-4 rounded-full shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/minion-avatars/default.webp' }}
                />
              )}
              <span className="text-xs font-medium text-foreground truncate">{g.agentName}</span>
              <span className="text-[10px] text-muted-foreground/70 bg-muted rounded-full px-1.5 py-0.5 shrink-0 ml-auto">
                {g.tasks.length}
              </span>
            </button>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="border-t border-border/30"
              >
                <div className="px-1.5 py-1.5 space-y-1">
                  {g.tasks
                    .sort((a, b) => {
                      const aT = a.completed_at ? new Date(a.completed_at).getTime() : 0;
                      const bT = b.completed_at ? new Date(b.completed_at).getTime() : 0;
                      return bT - aT;
                    })
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onCardClick(t)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-card/60 cursor-pointer text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground/90 truncate">{t.title}</p>
                        </div>
                        <span className="text-[10px] text-green-500/70 shrink-0 whitespace-nowrap" suppressHydrationWarning>
                          {timeAgo(t.completed_at)}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
            {!isExpanded && (
              <div className="px-2.5 pb-2 -mt-0.5">
                <p className="text-[10px] text-muted-foreground/60 truncate" suppressHydrationWarning>
                  Latest: {g.tasks[0]?.title} · {timeAgo(g.latestCompleted)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
