"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueueTask, FeatureRequest, Project, getPriorityColor, getFrPriorityColor } from "./types";

interface DetailSheetProps {
  item: QueueTask | FeatureRequest | null;
  projects: Project[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return "N/A";
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
  } catch {
    return "Invalid date";
  }
};

export function TaskDetailSheet({ item, projects, isOpen, onOpenChange }: DetailSheetProps) {
  const qc = useQueryClient();

  const taskMutation = useMutation({
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
      onOpenChange(false);
    },
  });
  
  const frToTaskMutation = useMutation({
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
      onOpenChange(false);
    }
  });

  if (!item) return null;

  const isDbTask = "created_at" in item;
  const proj = projects.find(p => p.id === (item.project || "other"));
  const projectIcon = proj?.icon || "📦";

  const renderStatusTransitions = (task: QueueTask) => {
    const buttons = [];
    switch (task.status) {
        case 'queued':
        case 'backlog':
            buttons.push({ action: 'plan', label: '📋 Plan' });
            buttons.push({ action: 'run', label: '▶️ Run Now' });
            break;
        case 'planned':
        case 'assigned':
            buttons.push({ action: 'run', label: '▶️ Run' });
            buttons.push({ action: 'requeue', label: '↩️ Back to Backlog' });
            break;
        case 'running':
            buttons.push({ action: 'review', label: 'Finish for Review' });
            buttons.push({ action: 'human', label: 'Flag for Human' });
            buttons.push({ action: 'fail', label: 'Mark as Failed' });
            break;
        case 'review':
            buttons.push({ action: 'approve', label: 'Approve' });
            buttons.push({ action: 'reject', label: 'Reject & Requeue' });
            break;
        case 'human_todo':
            buttons.push({ action: 'complete', label: 'Complete' });
            buttons.push({ action: 'requeue', label: 'Requeue' });
            break;
    }
    return buttons.map(btn => (
        <button key={btn.action} onClick={() => taskMutation.mutate({ id: task.id, action: btn.action })}
            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded px-3 py-1.5 transition-colors">
            {btn.label}
        </button>
    ));
};


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-xl bg-card/80 backdrop-blur-xl border-l-border overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-semibold text-foreground truncate pr-6">{item.title}</SheetTitle>
          <div className="flex items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <span>{projectIcon}</span>
              <span className="font-medium text-foreground/80">{proj?.label || item.project}</span>
            </div>
          </div>
        {isDbTask && (item.status === "running" || item.status === "planned") && item.agent_id && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                <img src={`/agents/${item.agent_id}.png`} alt={item.agent_name || item.agent_id} className="w-9 h-9 rounded-full bg-primary/10" />
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Assigned Agent</span>
                    <span className="text-sm font-semibold text-foreground">{item.agent_name || item.agent_id}</span>
                </div>
            </div>
        )}
        </SheetHeader>

        {isDbTask ? (
          <DbTaskDetails task={item as QueueTask} />
        ) : (
          <FrDetails fr={item as FeatureRequest} />
        )}
        
        <SheetFooter className="mt-6 pt-4 border-t border-border/50">
           {isDbTask ? (
                <div className="flex items-center gap-2 flex-wrap">
                    {renderStatusTransitions(item as QueueTask)}
                </div>
            ) : (
                 <button onClick={() => frToTaskMutation.mutate(item as FeatureRequest)}
                    className="text-sm w-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded px-4 py-2 transition-colors">
                    Queue as Task
                </button>
            )}
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}

function DbTaskDetails({ task }: { task: QueueTask }) {
    const pc = getPriorityColor(task.priority);
    return (
         <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="text-muted-foreground">Status</p><p className="font-mono bg-muted text-foreground rounded px-2 py-1">{task.status}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Priority</p><p className={`font-mono w-min ${pc.bg} ${pc.text} rounded px-2 py-1`}>P{task.priority}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Assigned Agent</p><p>{task.agent_name || task.agent_id || "None"}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Review Count</p><p>{task.review_count}</p></div>
            </div>

            {task.description && <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Description</h4>
                <p className="text-muted-foreground/80 whitespace-pre-wrap">{task.description}</p>
            </div>}
            
            {task.review_feedback && <div className="space-y-1 bg-amber-500/10 p-3 rounded-lg">
                <h4 className="font-semibold text-amber-400">Review Feedback</h4>
                <p className="text-amber-400/80 italic"> &ldquo;{task.review_feedback}&rdquo; (by {task.reviewer_id || 'unknown'})</p>
            </div>}

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                <div className="space-y-1"><p className="text-muted-foreground">Created</p><p>{formatDate(task.created_at)}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Started</p><p>{formatDate(task.started_at)}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Completed</p><p>{formatDate(task.completed_at)}</p></div>
            </div>
        </div>
    )
}

function FrDetails({ fr }: { fr: FeatureRequest }) {
     const pc = getFrPriorityColor(fr.priority);
     return (
        <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="text-muted-foreground">Status</p><p className="font-mono bg-muted text-foreground rounded px-2 py-1">{fr.status}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Priority</p><p className={`font-mono w-min ${pc.bg} ${pc.text} rounded px-2 py-1`}>{fr.priority}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Assigned</p><p>{fr.assigned || "None"}</p></div>
                {fr.depends_on && <div className="space-y-1"><p className="text-muted-foreground">Depends On</p><p>{fr.depends_on}</p></div>}
            </div>

            {fr.tags.length > 0 && <div className="flex items-center gap-2 flex-wrap">
                {fr.tags.map(t => <span key={t} className="text-xs bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5">{t}</span>)}
            </div>}

            {fr.description && <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Description</h4>
                <p className="text-muted-foreground/80 whitespace-pre-wrap">{fr.description}</p>
            </div>}
        </div>
     )
}
