"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";

interface DependencyTask {
  id: number;
  title: string;
  status: string;
}

interface DependenciesResponse {
  upstream: DependencyTask[];
  downstream: DependencyTask[];
}

// Status icon mapping per SPEC-129
function getStatusIcon(status: string): { icon: string; color: string } {
  switch (status) {
    case "done":
      return { icon: "✓", color: "text-emerald-500" };
    case "running":
      return { icon: "⏳", color: "text-amber-500" };
    case "review":
      return { icon: "👁", color: "text-blue-500" };
    case "queued":
    case "planned":
    case "assigned":
    case "backlog":
      return { icon: "○", color: "text-muted-foreground" };
    case "failed":
    case "cancelled":
      return { icon: "✗", color: "text-red-500" };
    default:
      return { icon: "○", color: "text-muted-foreground" };
  }
}

// Truncate title to ~40 chars
function truncateTitle(title: string, maxLen = 40): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + "…";
}

interface DependencyTreeProps {
  taskId: number;
  onTaskClick?: (taskId: number) => void;
}

export function DependencyTree({ taskId, onTaskClick }: DependencyTreeProps) {
  const [upstreamOpen, setUpstreamOpen] = useState(true);
  const [downstreamOpen, setDownstreamOpen] = useState(true);

  const { data, isLoading, error } = useQuery<DependenciesResponse>({
    queryKey: ["task-dependencies", taskId],
    queryFn: () =>
      fetch(`/api/tasks/${taskId}/dependencies`).then((res) => res.json()),
    staleTime: 30000, // 30s cache
  });

  // Hide if no dependencies on either side
  if (isLoading || error || (!data?.upstream?.length && !data?.downstream?.length)) {
    return null;
  }

  const { upstream, downstream } = data;

  const renderTask = (task: DependencyTask) => {
    const { icon, color } = getStatusIcon(task.status);
    return (
      <button
        key={task.id}
        onClick={() => onTaskClick?.(task.id)}
        className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-muted/50 transition-colors group"
      >
        <span className={`text-sm ${color}`}>{icon}</span>
        <span className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
          #{task.id}
        </span>
        <span className="text-sm text-foreground/80 truncate flex-1">
          {truncateTitle(task.title)}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <GitBranch className="w-4 h-4" />
        <span>Dependencies</span>
      </div>
      
      <div className="rounded-lg border border-border/50 bg-background/30 divide-y divide-border/30">
        {/* Upstream (Depends on) */}
        {upstream.length > 0 && (
          <Collapsible open={upstreamOpen} onOpenChange={setUpstreamOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors">
              {upstreamOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span>Depends on</span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({upstream.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <div className="space-y-0.5">{upstream.map(renderTask)}</div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Downstream (Blocks) */}
        {downstream.length > 0 && (
          <Collapsible open={downstreamOpen} onOpenChange={setDownstreamOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors">
              {downstreamOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span>Blocks</span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({downstream.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <div className="space-y-0.5">{downstream.map(renderTask)}</div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
