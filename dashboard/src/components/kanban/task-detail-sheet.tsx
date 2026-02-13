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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { QueueTask, FeatureRequest, Project, getPriorityColor, getFrPriorityColor } from "./types";
import { useState } from "react";
import { AgentAvatar } from "../ui/agent-avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { useEffect } from "react";

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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TaskDetailSheet({ item, projects, isOpen, onOpenChange }: DetailSheetProps) {
  const qc = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item && 'description' in item ? item.description : "");
  const [priority, setPriority] = useState(item && 'priority' in item ? (item as any).priority : 5);
  const [project, setProject] = useState(item?.project || "other");

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item && 'description' in item ? item.description : "");
      setPriority(item && 'priority' in item ? (item as any).priority : 5);
      setProject(item.project || "other");
    }
  }, [item]);


  const { data: agents = [] } = useQuery<{ agent_id: string; name: string }[]>({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((res) => res.json()),
  });

  const { data: timeline } = useQuery({
    queryKey: ["task-timeline", item?.id],
    queryFn: () => fetch(`/api/tasks/queue/${item!.id}/timeline`).then((res) => res.json()),
    enabled: !!item && "id" in item,
  });

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

  const updateField = (field: string, value: any) => {
    if (!item || !("id" in item)) return;
    taskMutation.mutate({
      id: Number(item.id),
      action: "update",
      payload: { fields: { [field]: value } },
    });
  };

  
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/queue/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      onOpenChange(false);
    },
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
    return buttons.map(btn => {
        const payload: any = {};
        if (btn.action === 'run' && selectedAgent) {
            payload.fields = { agent_id: selectedAgent };
        }
        return (
            <Button key={btn.action} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => taskMutation.mutate({ id: task.id, action: btn.action, payload })}
                variant="outline" size="sm" className="text-xs">
                {btn.label}
            </Button>
    )});
};

const renderAgentPicker = () => {
    if (!isDbTask || !['queued', 'backlog', 'planned', 'assigned'].includes((item as QueueTask).status)) {
        return null;
    }
    return (
        <div className="flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[200px] bg-background/70">
                    <SelectValue placeholder="Assign an agent..." />
                </SelectTrigger>
                <SelectContent>
                    {agents.map(agent => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id}>
                           <div className="flex items-center gap-2">
                                <AgentAvatar agentId={agent.agent_id} size={20} />
                                <span>{agent.name}</span>
                           </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}



  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-xl bg-card/80 backdrop-blur-xl border-l-border overflow-y-auto" aria-describedby="task-detail-desc">
        <SheetHeader className="mb-4">
          <SheetTitle className="sr-only">Task Details</SheetTitle>
          <SheetDescription id="task-detail-desc" className="sr-only">View and edit task details</SheetDescription>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            onBlur={() => updateField('title', title)}
            className="text-lg font-semibold text-foreground truncate pr-6 bg-transparent border-0 focus:ring-0 focus:border-0"
          />
          <div className="flex items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <Select value={project} onValueChange={(p) => { setProject(p); updateField('project', p); }}>
                <SelectTrigger className="w-auto border-0 bg-transparent">
                  <SelectValue>
                    <div className="flex items-center gap-1.5">
                      <span>{projectIcon}</span>
                      <span className="font-medium text-foreground/80">{proj?.label || item.project}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetHeader>

        {isDbTask ? (
          <>
            <DbTaskDetails task={item as QueueTask} onFieldChange={updateField} />
            {timeline && <TaskTimeline timeline={timeline} />}
          </>
        ) : (
          <FrDetails fr={item as FeatureRequest} />
        )}
        
        <SheetFooter className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
           {isDbTask ? (
                <div className="flex items-center gap-2 flex-wrap">
                    {renderAgentPicker()}
                    {renderStatusTransitions(item as QueueTask)}
                </div>
            ) : (
                 <button onClick={() => frToTaskMutation.mutate(item as FeatureRequest)}
                    className="text-sm w-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded px-4 py-2 transition-colors">
                    Queue as Task
                </button>
            )}
            {isDbTask && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="text-xs">🗑️ Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate((item as QueueTask).id)}>
                            Continue
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}


function DbTaskDetails({ task, onFieldChange }: { task: QueueTask, onFieldChange: (field: string, value: any) => void }) {
    const pc = getPriorityColor(task.priority);
    const [desc, setDesc] = useState(task.description || "");

    return (
         <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="text-muted-foreground">Status</p><p className="font-mono bg-muted text-foreground rounded px-2 py-1">{task.status}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Priority</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => {
                            const pColor = getPriorityColor(p);
                            return (
                                <button key={p} onClick={() => onFieldChange('priority', p)}
                                    className={`w-6 h-6 rounded-full text-xs ${p === task.priority ? `${pColor.bg} ${pColor.text}` : 'bg-muted hover:bg-muted/80'}`}>
                                    {p}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="space-y-1"><p className="text-muted-foreground">Assigned Agent</p><p>{task.agent_name || task.agent_id || "None"}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Review Count</p><p>{task.review_count}</p></div>
            </div>

            <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Description</h4>
                <Textarea 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)} 
                    onBlur={() => onFieldChange('description', desc)}
                    className="text-muted-foreground/80 whitespace-pre-wrap bg-transparent border rounded-md p-2"
                    placeholder="No description."
                />
            </div>
            
            {task.review_feedback && <div className="space-y-1 bg-amber-500/10 p-3 rounded-lg">
                <h4 className="font-semibold text-amber-400">Review Feedback</h4>
                <p className="text-amber-400/80 italic break-all"> &ldquo;{task.review_feedback?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  part.match(/^https?:\/\//) ? <button key={i} type="button" className="underline hover:text-amber-300 cursor-pointer text-left inline" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); window.open(part, '_blank'); }}>{part}</button> : part
                )}&rdquo; {task.reviewer_id ? `(by ${task.reviewer_id})` : ''}</p>
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

            {fr.tags?.length > 0 && <div className="flex items-center gap-2 flex-wrap">
                {fr.tags.map(t => <span key={t} className="text-xs bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5">{t}</span>)}
            </div>}

            {fr.description && <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Description</h4>
                <p className="text-muted-foreground/80 whitespace-pre-wrap">{fr.description}</p>
            </div>}
        </div>
     )
}

function TaskTimeline({ timeline }: { timeline: any[] }) {
    const getIcon = (event: string) => {
        switch (event) {
            case 'task_start': return '🟢';
            case 'task_complete': return '✅';
            case 'task_fail': return '❌';
            case 'task_progress': return '💬';
            case 'task_assign': return '📋';
            default: return '➡️';
        }
    }

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Activity</h4>
            <div className="space-y-4">
                {timeline.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                            <div className="text-lg">{getIcon(item.event)}</div>
                            <div className="w-px h-full bg-border"></div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</p>
                            <p className="text-sm">{(item.event || '').replace('task_', '').replace('_', ' ')}</p>
                            {item.data && <p className="text-xs text-muted-foreground">{JSON.stringify(item.data)}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
