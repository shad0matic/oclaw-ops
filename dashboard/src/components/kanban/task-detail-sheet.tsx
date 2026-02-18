"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { QueueTask, FeatureRequest, Project, getPriorityColor, getFrPriorityColor } from "./types";
import { useState, useEffect, useMemo } from "react";
import { AgentAvatar } from "../ui/agent-avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { TaskChecklist } from "./task-checklist";
import { TaskComments } from "./task-comments";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown, Trash2, Edit3, MoreVertical, Play, ArrowRight, Check, X, Bot, User, Milestone, Pause, Square, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper function for date formatting
const formatDate = (date: string | null | undefined) => {
  if (!date) return "N/A";
  try {
    return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: fr });
  } catch {
    return "Invalid date";
  }
};

// Main Sheet Component
export function TaskDetailSheet({ item, projects, isOpen, onOpenChange }: {
  item: QueueTask | FeatureRequest | null;
  projects: Project[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item && 'description' in item ? item.description : "");
  const [project, setProject] = useState(item?.project || "other");

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item && 'description' in item ? item.description : "");
      setProject(item.project || "other");
    }
  }, [item]);

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
    if (!item || !("id" in item) || typeof item.id !== 'number') return;
    taskMutation.mutate({
      id: item.id,
      action: "update",
      payload: { fields: { [field]: value } },
      closeOnSuccess: false,
    });
  };

  if (!item) return null;

  const isDbTask = "created_at" in item;
  const taskId = isDbTask ? (item as QueueTask).id : undefined;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[500px] sm:max-w-xl bg-card/80 backdrop-blur-xl border-l-border p-0 flex flex-col" aria-describedby="task-detail-desc">
        <TaskDetailHeader 
          item={item} 
          projects={projects} 
          title={title}
          setTitle={setTitle}
          updateField={updateField}
          project={project}
          setProject={setProject}
        />
        
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="description" className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea 
              id="description"
              value={description || ""} 
              onChange={(e) => setDescription(e.target.value)} 
              onBlur={() => updateField('description', description)}
              className="text-foreground/80 whitespace-pre-wrap bg-background/50 border rounded-md p-3 sm:p-2 resize-y"
              placeholder="No description."
              rows={8}
            />
          </div>

          {taskId && <TaskChecklist taskId={taskId} />}
      {taskId && <TaskComments taskId={taskId} />}
          
          {isDbTask && <NotesSection task={item as QueueTask} updateField={updateField} />}
          
          {!isDbTask && <FrDetails fr={item as FeatureRequest} />}
        </div>
        
        {isDbTask && 
          <TaskDetailFooter 
            task={item as QueueTask} 
            taskMutation={taskMutation}
            updateField={updateField}
            onOpenChange={onOpenChange}
          />
        }
      </SheetContent>
    </Sheet>
  );
}

// Header Component
function TaskDetailHeader({ item, projects, title, setTitle, updateField, project, setProject }: any) {
  const proj = projects.find((p: Project) => p.id === (project || "other"));
  const projectIcon = proj?.icon || "📦";

  return (
    <div className="shrink-0 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-3">
      <SheetHeader className="mb-0">
        <SheetTitle className="sr-only">Task Details</SheetTitle>
        <SheetDescription id="task-detail-desc" className="sr-only">View and edit task details</SheetDescription>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground/60">#{item.id}</span>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            onBlur={() => updateField('title', title)}
            className="h-9 flex-1 text-lg font-semibold text-foreground truncate bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <Select value={project} onValueChange={(p) => { setProject(p); updateField('project', p); }}>
              <SelectTrigger className="h-auto border-0 bg-transparent p-0 focus:ring-0 focus:ring-offset-0">
                <SelectValue>
                  <div className="flex items-center gap-1.5">
                    <span>{projectIcon}</span>
                    <span className="font-medium text-foreground/80">{proj?.label || item.project}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: Project) => (
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
          <div className="flex-1" />
          {'status' in item && 
            <span className="font-mono bg-muted text-foreground rounded px-2 py-0.5 text-xs">{item.status}</span>
          }
        </div>
        
        {/* Timestamps */}
        {'created_at' in item && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2">
            {item.created_at && (
              <span>Created: {formatDate(item.created_at)}</span>
            )}
            {item.started_at && (
              <span>Started: {formatDate(item.started_at)}</span>
            )}
            {item.completed_at && ['review', 'human_todo', 'done', 'failed', 'cancelled'].includes(item.status) && (
              <span>Finished: {formatDate(item.completed_at)}</span>
            )}
          </div>
        )}
      </SheetHeader>
    </div>
  );
}

// Footer Component
function TaskDetailFooter({ task, taskMutation, updateField, onOpenChange }: {
    task: QueueTask;
    taskMutation: any;
    updateField: (field: string, value: any) => void;
    onOpenChange: (isOpen: boolean) => void;
}) {
  const qc = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>(task.agent_id || "");

  const { data: agents = [] } = useQuery<{ agent_id: string; name: string }[]>({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((res) => res.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/queue/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-queue"] });
      onOpenChange(false);
    },
  });

  const statusTransitions = useMemo(() => {
    const buttons: { action: string; label: string; icon: React.ElementType; tooltip: string; primary?: boolean }[] = [];
    switch (task.status) {
        case 'queued':
        case 'backlog':
            buttons.push({ action: 'run', label: 'Run Now', icon: Play, tooltip: 'Start task immediately (assigns agent, moves to Running)', primary: true });
            if (!task.speced) {
                buttons.push({ action: 'spec', label: 'Spec This', icon: FileText, tooltip: 'Create a spec for this task' });
            }
            buttons.push({ action: 'plan', label: 'Plan', icon: Milestone, tooltip: 'Move to Planned column for scheduling' });
            break;
        case 'planned':
        case 'assigned':
            buttons.push({ action: 'run', label: 'Run', icon: Play, tooltip: 'Start working on this task now', primary: true });
            buttons.push({ action: 'requeue', label: 'Back to Backlog', icon: ArrowRight, tooltip: 'Move back to Backlog for later' });
            break;
        case 'running':
            buttons.push({ action: 'review', label: 'Finish for Review', icon: Check, tooltip: 'Mark as complete, move to Review for validation', primary: true });
            buttons.push({ action: 'pause', label: 'Pause', icon: Pause, tooltip: 'Pause task, move back to Planned' });
            buttons.push({ action: 'human', label: 'Flag for Human', icon: User, tooltip: 'Needs human attention before continuing' });
            buttons.push({ action: 'cancel', label: 'Cancel', icon: Square, tooltip: 'Cancel this task' });
            break;
        case 'review':
        case 'human_todo': // Legacy - treat same as review
            buttons.push({ action: 'complete', label: 'Done', icon: Check, tooltip: 'Mark as Done', primary: true });
            buttons.push({ action: 'toggle_todo', label: task.tags?.includes('todo') ? 'Clear TODO' : 'Mark TODO', icon: User, tooltip: task.tags?.includes('todo') ? 'Remove TODO tag' : 'Mark as needing human action' });
            buttons.push({ action: 'reject', label: 'Back to Agent', icon: ArrowRight, tooltip: 'Send back to Running for more work' });
            break;
    }
    return buttons;
  }, [task.status]);

  const primaryAction = statusTransitions.find(b => b.primary);
  const secondaryActions = statusTransitions.filter(b => !b.primary);

  const handleAction = (action: string) => {
    const payload: any = {};
    if (action === 'run' && selectedAgent) {
        payload.fields = { agent_id: selectedAgent };
    }
    taskMutation.mutate({ id: task.id, action, payload });
  };
  
  return (
    <div className="shrink-0 border-t border-border/50 px-4 py-3 sm:px-6 sm:py-3">
      <div className="flex items-center gap-2">
        {/* Priority Selector */}
        <Select value={String(task.priority)} onValueChange={(p) => updateField('priority', parseInt(p, 10))}>
          <SelectTrigger className="w-auto h-11 min-h-11">
            <SelectValue>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs">P</span>
                <span className={`font-semibold ${getPriorityColor(task.priority).text}`}>{task.priority}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => {
              const pColor = getPriorityColor(p);
              return <SelectItem key={p} value={String(p)}><span className={pColor.text}>P{p}</span></SelectItem>;
            })}
          </SelectContent>
        </Select>

        {/* Agent Picker */}
        <Select value={selectedAgent} onValueChange={(agentId) => {
            setSelectedAgent(agentId);
            updateField('agent_id', agentId);
        }}>
          <SelectTrigger className="flex-1 h-11 min-h-11 bg-background/70">
            <SelectValue>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                {agents.find(a => a.agent_id === selectedAgent)?.name || "Assign agent..."}
              </div>
            </SelectValue>
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
        
        {/* Action Buttons */}
        <TooltipProvider delayDuration={300}>
          {primaryAction && 
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => handleAction(primaryAction.action)} 
                  className="h-11 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3"
                >
                  <primaryAction.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{primaryAction.label}</p>
                <p className="text-xs text-muted-foreground">{primaryAction.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          }
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 min-h-11 min-w-11">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map(btn => (
                <DropdownMenuItem key={btn.action} onClick={() => handleAction(btn.action)} className="flex flex-col items-start">
                    <div className="flex items-center">
                      <btn.icon className="mr-2 h-4 w-4" />
                      <span>{btn.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">{btn.tooltip}</span>
                </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-red-400/70 hover:text-red-400 transition-colors w-full flex items-center">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the task.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(task.id)}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Notes Section
function NotesSection({ task, updateField }: { task: QueueTask; updateField: (field: string, value: any) => void; }) {
  const [notes, setNotes] = useState(task.notes || "");
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full">
        <Edit3 className="w-4 h-4 text-muted-foreground" />
        <span>Notes</span>
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground ml-auto" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          onBlur={() => updateField('notes', notes)}
          className="mt-2 text-amber-400/80 whitespace-pre-wrap bg-amber-500/5 border-amber-500/20 rounded-md p-3 sm:p-2"
          placeholder="Add notes (instructions, context, feedback...)"
          rows={4}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// FR Details
function FrDetails({ fr }: { fr: FeatureRequest }) {
     const pc = getFrPriorityColor(fr.priority);
     return (
        <div className="space-y-4 text-sm bg-background/50 p-4 rounded-lg border">
            <h3 className="font-semibold">Feature Request Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="text-muted-foreground">Status</p><p className="font-mono bg-muted text-foreground rounded px-2 py-1">{fr.status}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Priority</p><p className={`font-mono w-min ${pc.bg} ${pc.text} rounded px-2 py-1`}>{fr.priority}</p></div>
                <div className="space-y-1"><p className="text-muted-foreground">Assigned</p><p>{fr.assigned || "None"}</p></div>
                {fr.depends_on && <div className="space-y-1"><p className="text-muted-foreground">Depends On</p><p>{fr.depends_on}</p></div>}
            </div>
            {fr.tags?.length > 0 && <div className="flex items-center gap-2 flex-wrap">
                {fr.tags.map(t => <span key={t} className="text-xs bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5">{t}</span>)}
            </div>}
        </div>
     )
}
