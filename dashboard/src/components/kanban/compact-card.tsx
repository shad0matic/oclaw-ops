"use client";

import { motion } from "framer-motion";
import { useDrag } from "react-dnd";
import { useRef } from "react";
import { ItemTypes } from "./item-types";
import { QueueTask, Project, getPriorityColor } from "./types";

interface TaskCardProps {
  task: QueueTask;
  projects: Project[];
  onClick: () => void;
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ... (imports remain the same)

export function CompactTaskCard({ task, projects, onClick }: TaskCardProps) {
  // ... (ref, pc, drag hooks remain the same)
  const ref = useRef<HTMLDivElement>(null);
  const pc = getPriorityColor(task.priority);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.DB_TASK_CARD,
      item: { id: task.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id]
  );

  drag(ref);

  const proj = projects.find(p => p.id === (task.project || "other"));
  const epicProj = task.epic ? projects.find(p => p.id === task.epic) : null;
  const projectIcon = proj?.icon || "📦";
  const projectColor = proj?.color || "border-l-zinc-500";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-md border border-border bg-card/40 hover:bg-card/80 p-2 cursor-pointer active:cursor-grabbing border-l-2 ${projectColor}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div onClick={onClick}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">
              {task.speced && <span title="Speced & ready to build" className="inline-block mr-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded px-1">✓ speced</span>}
              {task.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
              <span>{projectIcon}</span>
              <span className="truncate">{proj?.label || task.project}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-mono ${pc.text} ${pc.bg} rounded px-1.5 py-0.5`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              P{task.priority}
            </span>
            {task.agent_id && (
              <div className="flex items-center gap-1">
                <img
                  src={`/assets/minion-avatars/${task.agent_id}.webp`}
                  alt={task.agent_name || task.agent_id}
                  className="w-3.5 h-3.5 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-[11px] text-muted-foreground/80">{task.agent_name || task.agent_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {epicProj && (
        <Link href={`/tasks/projects/${epicProj.id}`} onClick={e => e.stopPropagation()}>
            <Badge className="absolute top-1 right-1 text-xs px-2 py-0.5">
                {epicProj.icon} {epicProj.label}
            </Badge>
        </Link>
      )}
    </motion.div>
  );
}

