"use client";

import TaskDetailView from "./task-detail-view";
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
    mutationFn: async ({ id, action, payload, closeOnSuccess = true }: { id: number; action: string; payload?: any; closeOnSuccess?: boolean }) => {
      const res = await fetch(`/api/tasks/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const data = await res.json();
      return { ...data, _closeOnSuccess: closeOnSuccess };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      if (data?._closeOnSuccess !== false) onOpenChange(false);
    },
  });

  const updateField = (field: string, value: any) => {
    if (!item || !("id" in item)) return;
    const numId = Number(item.id);
    if (isNaN(numId)) return; // FR items have string IDs, skip DB mutations
    taskMutation.mutate({
      id: numId,
      action: "update",
      payload: { fields: { [field]: value } },
      closeOnSuccess: false,
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
    const buttons: { action: string; label: string; primary?: boolean }[] = [];
    switch (task.status) {
        case 'queued':
        case 'backlog':
            buttons.push({ action: 'run', label: '▶️ Run Now', primary: true });
            buttons.push({ action: 'plan', label: '📋 Plan' });
            break;
        case 'planned':
        case 'assigned':
            buttons.push({ action: 'run', label: '▶️ Run', primary: true });
            buttons.push({ action: 'requeue', label: '↩️ Back to Backlog' });
            break;
        case 'running':
            buttons.push({ action: 'review', label: 'Finish for Review', primary: true });
            buttons.push({ action: 'human', label: 'Flag for Human' });
            buttons.push({ action: 'fail', label: 'Mark as Failed' });
            break;
        case 'review':
            buttons.push({ action: 'approve', label: '✅ Approve', primary: true });
            buttons.push({ action: 'reject', label: 'Reject & Requeue' });
            break;
        case 'human_todo':
            buttons.push({ action: 'complete', label: '✅ Complete', primary: true });
            buttons.push({ action: 'requeue', label: 'Requeue' });
            break;
    }
    return buttons.map(btn => {
        const payload: any = {};
        if (btn.action === 'run' && selectedAgent) {
            payload.fields = { agent_id: selectedAgent };
        }
        const isPrimary = btn.primary;
        return (
            <Button 
                key={btn.action} 
                type="button" 
                onMouseDown={(e) => e.preventDefault()} 
                onClick={() => taskMutation.mutate({ id: task.id, action: btn.action, payload })}
                variant={isPrimary ? "default" : "outline"} 
                size="sm" 
                className={`h-12 sm:h-9 min-h-12 sm:min-h-9 w-full text-sm ${isPrimary ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium' : 'text-xs'}`}
            >
                {btn.label}
            </Button>
    )});
};

const renderAgentPicker = () => {
    if (!isDbTask || !['queued', 'backlog', 'planned', 'assigned'].includes((item as QueueTask).status)) {
        return null;
    }
    return (
        <div className="w-full sm:w-auto flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background/70 min-h-11 sm:min-h-9">
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
      <SheetContent className="w-full sm:w-[500px] sm:max-w-xl bg-card/80 backdrop-blur-xl border-l-border p-0" aria-describedby="task-detail-desc">
        <div className="flex h-dvh sm:h-full flex-col">
          <div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-6">
            <SheetHeader className="mb-0">
              <SheetTitle className="sr-only">Task Details</SheetTitle>
              <SheetDescription id="task-detail-desc" className="sr-only">View and edit task details</SheetDescription>
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0">#{item.id}</span>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  onBlur={() => updateField('title', title)}
                  className="h-11 sm:h-auto min-w-0 text-lg font-semibold text-foreground truncate pr-6 bg-transparent border-0 focus:ring-0 focus:border-0"
                />
              </div>
              <div className="flex items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <Select value={project} onValueChange={(p) => { setProject(p); updateField('project', p); }}>
                    <SelectTrigger className="min-h-11 sm:min-h-9 w-auto border-0 bg-transparent">
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
                {'epic' in item && <EpicInput epic={(item as any).epic || ''} onSave={(epic) => updateField('epic', epic)} />}
              </div>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {isDbTask ? (
              <>
                <DbTaskDetails task={item as QueueTask} onFieldChange={updateField} />
                {timeline && <TaskTimeline timeline={timeline} />}

                {/* Rich detail view (stats, detailed timeline, spawns) */}
                {typeof (item as any).id === "number" && <TaskDetailView taskId={(item as any).id} />}
              </>
            ) : (
              <FrDetails fr={item as FeatureRequest} />
            )}
          </div>

          <div className="shrink-0 border-t border-border/50 px-4 py-4 sm:px-6 sm:py-6">
            <SheetFooter className="mt-0 flex flex-col gap-4">
              {isDbTask ? (
                <div className="w-full flex flex-col gap-3">
                  {renderAgentPicker()}
                  <div className="flex flex-col gap-2">
                    {renderStatusTransitions(item as QueueTask)}
                  </div>
                </div>
              ) : (
                <button onClick={() => frToTaskMutation.mutate(item as FeatureRequest)}
                  className="text-sm w-full min-h-11 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded px-4 py-3 sm:py-2 transition-colors">
                  Queue as Task
                </button>
              )}
              {isDbTask && (
                <div className="pt-2 border-t border-border/30">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                        Delete task
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the task.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11 sm:min-h-9">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="min-h-11 sm:min-h-9" onClick={() => deleteMutation.mutate((item as QueueTask).id)}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


function SpecUrlInput({ onSave }: { onSave: (url: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [url, setUrl] = useState("");
    if (!editing) return <button onClick={() => setEditing(true)} className="text-xs min-h-11 px-2 rounded text-muted-foreground hover:text-foreground">+ Add spec link</button>;
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-1">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/..." className="min-h-11 flex-1 text-xs bg-muted border rounded px-3 py-2 sm:px-2 sm:py-1" />
            <button onClick={() => { if (url.trim()) { onSave(url.trim()); setEditing(false); } }} className="min-h-11 text-xs bg-blue-600 text-white rounded px-4 py-2 sm:px-2 sm:py-1">Save</button>
        </div>
    );
}

function EpicInput({ epic, onSave }: { epic: string, onSave: (epic: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(epic);
    
    if (!editing) {
        return (
            <button onClick={() => setEditing(true)} className="text-xs min-h-11 px-2 rounded text-muted-foreground hover:text-foreground">
                {epic ? `Epic: ${epic}` : "+ Add Epic"}
            </button>
        );
    }
    
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-1">
            <input 
                value={value} 
                onChange={e => setValue(e.target.value)} 
                placeholder="Epic name..." 
                className="min-h-11 flex-1 text-xs bg-muted border rounded px-3 py-2 sm:px-2 sm:py-1" 
            />
            <button 
                onClick={() => { 
                    if (value.trim()) { 
                        onSave(value.trim()); 
                        setEditing(false); 
                    } 
                }} 
                className="min-h-11 text-xs bg-blue-600 text-white rounded px-4 py-2 sm:px-2 sm:py-1"
            >
                Save
            </button>
        </div>
    );
}

function KpiDisplay({ progress }: { progress: QueueTask['progress'] }) {
    if (!progress?.kpis?.length) return null;
    
    return (
        <div className="space-y-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-indigo-400 text-sm">📊 Progress</h4>
                {progress.updatedAt && (
                    <span className="text-[10px] text-muted-foreground">
                        {formatDate(progress.updatedAt)}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {progress.kpis.map((kpi, i) => (
                    <div key={i} className="bg-background/50 rounded-md p-2">
                        <div className="text-xs text-muted-foreground">{kpi.label}</div>
                        <div className="text-lg font-bold text-foreground">
                            {kpi.value.toLocaleString()}
                            {kpi.target && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    {' / '}{kpi.target.toLocaleString()}
                                </span>
                            )}
                        </div>
                        {kpi.unit && <div className="text-[10px] text-muted-foreground">{kpi.unit}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DbTaskDetails({ task, onFieldChange }: { task: QueueTask, onFieldChange: (field: string, value: any) => void }) {
    const pc = getPriorityColor(task.priority);
    const [desc, setDesc] = useState(task.description || "");
    const [notes, setNotes] = useState(task.notes || "");

    return (
         <div className="space-y-4 text-sm">
            {/* KPI Progress Display */}
            <KpiDisplay progress={task.progress} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="text-muted-foreground">Status</p><p className="font-mono bg-muted text-foreground rounded px-2 py-1">{task.status}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Priority</p>
                    <div className="grid grid-cols-5 gap-2 sm:flex sm:gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => {
                            const pColor = getPriorityColor(p);
                            return (
                                <button key={p} onClick={() => onFieldChange('priority', p)}
                                    className={`w-11 h-11 sm:w-6 sm:h-6 rounded-full text-xs ${p === task.priority ? `${pColor.bg} ${pColor.text}` : 'bg-muted hover:bg-muted/80'}`}>
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
                    className="text-muted-foreground/80 whitespace-pre-wrap bg-transparent border rounded-md p-3 sm:p-2 resize-none"
                    placeholder="No description."
                    rows={Math.max(3, Math.min(10, (desc || '').split('\n').length + 1))}
                />
            </div>
            
            <div className="space-y-1">
                <h4 className="font-semibold text-foreground">📝 Notes</h4>
                <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    onBlur={() => onFieldChange('notes', notes)}
                    className="text-amber-400/80 whitespace-pre-wrap bg-amber-500/5 border-amber-500/20 rounded-md p-3 sm:p-2"
                    placeholder="Add notes (instructions, context, feedback...)"
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Spec / Docs</h4>
                    <button
                        onClick={() => onFieldChange('speced', !task.speced)}
                        className={`text-[11px] min-h-11 sm:min-h-8 px-3 py-2 sm:px-2 sm:py-0.5 rounded transition-colors ${task.speced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                        {task.speced ? '✓ Speced' : 'Mark as speced'}
                    </button>
                </div>
                {task.spec_url ? (
                    <a href={task.spec_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-xs break-all">
                        📄 {task.spec_url.replace(/.*github\.com\/[^/]+\/[^/]+\/blob\/main\//, '')}
                    </a>
                ) : (
                    <SpecUrlInput onSave={(url) => onFieldChange('spec_url', url)} />
                )}
            </div>

            {task.review_feedback && <div className="space-y-1 bg-amber-500/10 p-3 rounded-lg">
                <h4 className="font-semibold text-amber-400">Review Feedback</h4>
                <p className="text-amber-400/80 italic break-all"> &ldquo;{task.review_feedback?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  part.match(/^https?:\/\//) ? <button key={i} type="button" className="underline hover:text-amber-300 cursor-pointer text-left inline" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); window.open(part, '_blank'); }}>{part}</button> : part
                )}&rdquo; {task.reviewer_id ? `(by ${task.reviewer_id})` : ''}</p>
            </div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                {timeline.map((item, index) => {
                    const event = item.eventType || item.event || '';
                    const timestamp = item.createdAt || item.timestamp;
                    const detail = item.detail || item.data;
                    return (
                        <div key={index} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div className="text-lg">{getIcon(event)}</div>
                                <div className="w-px h-full bg-border"></div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{formatDate(timestamp)}</p>
                                <p className="text-sm">{event.replace('task_', '').replace('_', ' ')}</p>
                                {detail && <p className="text-xs text-muted-foreground">{typeof detail === 'string' ? detail : JSON.stringify(detail)}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}
