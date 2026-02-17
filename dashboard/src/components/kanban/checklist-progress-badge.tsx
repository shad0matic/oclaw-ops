"use client";

import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";

interface ChecklistSummary {
  total: number;
  done: number;
  running: number;
  pending: number;

  skipped: number;
  failed: number;
}

interface ChecklistData {
  steps: any[];
  summary: ChecklistSummary;
}

export function ChecklistProgressBadge({ taskId }: { taskId: number }) {
  const { data } = useQuery<ChecklistData>({
    queryKey: ["task-checklist-summary", taskId],
    queryFn: () => fetch(`/api/tasks/queue/${taskId}/checklist`).then(r => r.json()),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const s = data?.summary;
  if (!s || s.total === 0) return null;

  return (
    <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-0.5">
      <ListChecks className="w-2.5 h-2.5" />
      {s.done}/{s.total}
    </span>
  );
}
