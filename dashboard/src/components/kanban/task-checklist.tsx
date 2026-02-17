"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, XCircle, SkipForward, Plus, GripVertical, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistStep {
  id: number;
  task_id: number;
  step_order: number;
  title: string;
  description?: string;
  status: "pending" | "running" | "done" | "skipped" | "failed";
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

interface ChecklistSummary {
  total: number;
  done: number;
  running: number;
  pending: number;
  skipped: number;
  failed: number;
}

interface ChecklistData {
  steps: ChecklistStep[];
  summary: ChecklistSummary;
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: ChecklistStep["status"] }) {
  switch (status) {
    case "done":    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case "running": return <Loader2     className="w-4 h-4 text-blue-400 animate-spin shrink-0" />;
    case "failed":  return <XCircle     className="w-4 h-4 text-red-500 shrink-0" />;
    case "skipped": return <SkipForward className="w-4 h-4 text-muted-foreground shrink-0" />;
    default:        return <Circle      className="w-4 h-4 text-muted-foreground/40 shrink-0" />;
  }
}

// ─── Single Step Row ──────────────────────────────────────────────────────────

function StepRow({ step, taskId }: { step: ChecklistStep; taskId: number }) {
  const qc = useQueryClient();

  const patchStep = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const deleteStep = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist/${step.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Cannot delete step");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const isDone = step.status === "done";
  const isActive = step.status === "running";

  return (
    <div className={cn(
      "flex items-start gap-2 py-2 px-1 rounded-md group transition-colors",
      isActive && "bg-blue-500/5 border border-blue-500/20",
      isDone && "opacity-60",
    )}>
      {/* Drag handle — drag-and-drop not in v1, reserved */}
      <GripVertical className="w-3 h-3 text-muted-foreground/20 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />

      {/* Clickable status toggle (pending ↔ done for manual override) */}
      <button
        className="mt-0.5"
        onClick={() => {
          if (step.status === "pending" || step.status === "failed") {
            patchStep.mutate({ action: "complete", payload: { completed_by: "boss" } });
          } else if (step.status === "done") {
            patchStep.mutate({ action: "reset" });
          }
        }}
        title={step.status === "done" ? "Reset step" : "Mark done"}
      >
        <StepIcon status={patchStep.isPending ? "running" : step.status} />
      </button>

      {/* Title + notes */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug",
          isDone && "line-through text-muted-foreground",
        )}>
          {step.title}
        </p>
        {step.notes && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate" title={step.notes}>
            {step.notes}
          </p>
        )}
        {step.completed_by && isDone && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            ✓ by {step.completed_by}
          </p>
        )}
      </div>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-xs">
          {step.status !== "done" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "complete", payload: { completed_by: "boss" } })}>
              ✓ Mark done
            </DropdownMenuItem>
          )}
          {step.status !== "skipped" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "skip", payload: { completed_by: "boss" } })}>
              ↷ Skip
            </DropdownMenuItem>
          )}
          {step.status !== "pending" && (
            <DropdownMenuItem onClick={() => patchStep.mutate({ action: "reset" })}>
              ↺ Reset to pending
            </DropdownMenuItem>
          )}
          {["pending", "skipped", "failed"].includes(step.status) && (
            <DropdownMenuItem
              className="text-red-400"
              onClick={() => deleteStep.mutate()}
            >
              🗑 Delete step
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Add Step Form ────────────────────────────────────────────────────────────

function AddStepForm({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const qc = useQueryClient();

  const addStep = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/queue/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to add step");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", taskId] });
      setTitle("");
      onDone();
    },
  });

  return (
    <div className="flex gap-2 mt-2">
      <Input
        autoFocus
        placeholder="Step title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) addStep.mutate();
          if (e.key === "Escape") onDone();
        }}
        className="h-8 text-sm bg-background/50"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={!title.trim() || addStep.isPending}
        onClick={() => addStep.mutate()}
      >
        Add
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskChecklist({ taskId }: { taskId: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery<ChecklistData>({
    queryKey: ["task-checklist", taskId],
    queryFn: () =>
      fetch(`/api/tasks/queue/${taskId}/checklist`).then((r) => r.json()),
    refetchInterval: 15000, // poll every 15s while sheet is open
  });

  const summary = data?.summary;
  const steps = data?.steps ?? [];
  const progressPct = summary && summary.total > 0
    ? Math.round(((summary.done + summary.skipped) / summary.total) * 100)
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <span>Checklist</span>
        {summary && summary.total > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs font-mono">
            {summary.done + summary.skipped}/{summary.total}
          </Badge>
        )}
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground ml-auto" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-0.5">
          {/* Progress bar */}
          {summary && summary.total > 0 && (
            <div className="pb-2">
              <Progress value={progressPct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {progressPct}% complete
                {summary.failed > 0 && ` · ${summary.failed} failed`}
                {summary.running > 0 && ` · ${summary.running} running`}
              </p>
            </div>
          )}

          {/* Step list */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading...</p>
          ) : steps.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic py-2">
              No steps yet. Add one or let the agent plan them.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} taskId={taskId} />
              ))}
            </div>
          )}

          {/* Add step form */}
          {showAddForm ? (
            <AddStepForm taskId={taskId} onDone={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2 py-1"
            >
              <Plus className="w-3 h-3" /> Add step
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
