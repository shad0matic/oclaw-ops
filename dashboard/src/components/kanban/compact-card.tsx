"use client";

import { motion } from "framer-motion";
import { useDrag } from "react-dnd";
import { useRef } from "react";
import { ItemTypes } from "./item-types";
import { QueueTask, Project, getPriorityColor, TaskComment } from "./types";
import { ChatStatusIcon } from "@/components/ui/chat-status-icon";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type CommentStatus = 'waiting' | 'attention' | 'gray';


function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface TaskCardProps {
  task: QueueTask;
  projects: Project[];
  onClick: () => void;
}

const spinnerAnimation = `
@keyframes acked-spinner {
  to { transform: rotate(360deg); }
}
.acked-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(252, 211, 77, 0.2); /* amber-300 */
  border-top-color: rgba(252, 211, 77, 0.8);
  border-radius: 50%;
  animation: acked-spinner 0.8s linear infinite;
}
.auto-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  overflow: hidden;
  pointer-events: none;
}
.auto-ribbon span {
  position: absolute;
  display: block;
  width: 60px;
  padding: 1px 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 8px;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transform: rotate(45deg);
  top: 8px;
  right: -16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
`;

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
  
  const getCommentStatus = (task: QueueTask): CommentStatus | null => {
      if (!task.comments || task.comments.length === 0) {
        return null;
      }

      // Gray for closed tasks
      if (task.status === 'done' || task.status === 'review') {
        return 'gray';
      }

      const sortedComments = [...task.comments].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastComment = sortedComments[0];
      const lastCommenterIsBoss = lastComment.author === 'boss';

      if (lastCommenterIsBoss) {
        // Boss commented last - waiting for agent (blue)
        return 'waiting';
      } else {
        // Agent replied - needs Boss attention (pulsing amber)
        return 'attention';
      }
  }
  
  const commentStatus = getCommentStatus(task);


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
      <style>{spinnerAnimation}</style>
      {task.created_by && task.created_by !== 'boss' && (
        <div className="auto-ribbon" title={`Created by ${task.created_by}`}>
          <span>auto</span>
        </div>
      )}
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
              {task.status === 'done' && task.completed_at && (
                <span className="text-green-500/70">✓ {timeAgo(task.completed_at)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-mono ${pc.text} ${pc.bg} rounded px-1.5 py-0.5`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              P{task.priority}
            </span>
            <div className="flex items-center gap-1">
                {commentStatus && (
                    <ChatStatusIcon status={commentStatus} commentCount={task.comments?.length || 0} />
                )}
                {task.agent_id && (
                  <>
                    {task.status === 'running' && (
                      task.acked 
                        ? <span title="Acknowledged & Dispatched" className="text-emerald-500 text-xs">✓</span>
                        : <span title="Awaiting Dispatch" className="acked-spinner"></span>
                    )}
                    <img
                      src={`/assets/minion-avatars/${task.agent_id}.webp`}
                      alt={task.agent_name || task.agent_id}
                      className="w-3.5 h-3.5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-[11px] text-muted-foreground/80">{task.agent_name || task.agent_id}</span>
                  </>
                )}
            </div>
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

