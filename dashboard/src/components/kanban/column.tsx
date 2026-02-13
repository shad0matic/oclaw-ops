"use client";

import { useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { CompactTaskCard } from "./compact-card";
import { CompactFrCard } from "./compact-fr-card";
import { ItemTypes } from "./item-types";
import { QueueTask, FeatureRequest, Project } from "./types";

interface ColumnProps {
  title: string;
  status: string;
  tasks: QueueTask[];
  featureRequests?: FeatureRequest[];
  actionMap: Record<string, string>;
  projects: Project[];
  onCardClick: (item: QueueTask | FeatureRequest) => void;
  className?: string;
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

  return (
    <div
      ref={ref}
      className={`rounded-xl border p-3 bg-card/30 border-border min-h-[50vh] transition-colors duration-200 ${
        isOver ? "bg-card/60 border-zinc-600" : ""
      } ${className}`}
    >
      <div className="hidden lg:flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground/70 bg-muted rounded-full px-2 py-0.5">{totalItems}</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {featureRequests?.map(fr => <CompactFrCard key={fr.id} fr={fr} projects={projects} onClick={() => onCardClick(fr)} />)}
          {tasks
            .sort((a, b) => a.priority - b.priority)
            .map((t) => (
              <CompactTaskCard key={t.id} task={t} projects={projects} onClick={() => onCardClick(t)} />
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
