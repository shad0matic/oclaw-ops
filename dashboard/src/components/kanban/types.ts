export interface Project {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
}

export type QueueStatus = "backlog" | "planned" | "running" | "review" | "human_todo" | "done";

export interface QueueTask {
  id: number;
  title: string;
  description: string | null;
  project: string;
  agent_id: string | null;
  agent_name?: string | null;
  priority: number;
  status: QueueStatus | string;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  review_count: number;
  reviewer_id: string | null;
  review_feedback: string | null;
  depends_on?: string | null;
  spec_url?: string | null;
}

export interface FeatureRequest {
  id: string;
  filename: string;
  title: string;
  project: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  assigned: string | null;
  tags: string[];
  depends_on: string | null;
  description: string;
}

// Priority color mapping: P1 (red/urgent) → P9 (grey/low)
export function getPriorityColor(p: number): { dot: string; text: string; bg: string } {
  if (p <= 1) return { dot: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" };
  if (p <= 2) return { dot: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-500/10" };
  if (p <= 3) return { dot: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" };
  if (p <= 4) return { dot: "bg-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" };
  if (p <= 5) return { dot: "bg-lime-500", text: "text-lime-400", bg: "bg-lime-500/10" };
  if (p <= 6) return { dot: "bg-green-500", text: "text-green-400", bg: "bg-green-500/10" };
  if (p <= 7) return { dot: "bg-teal-500", text: "text-teal-400", bg: "bg-teal-500/10" };
  if (p <= 8) return { dot: "bg-zinc-400", text: "text-muted-foreground", bg: "bg-zinc-500/10" };
  return { dot: "bg-zinc-600", text: "text-muted-foreground/70", bg: "bg-zinc-600/10" };
}

export function getFrPriorityColor(p: 'high' | 'medium' | 'low'): { dot: string; text: string; bg: string } {
  switch (p) {
    case 'high': return { dot: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-500/10" };
    case 'medium': return { dot: "bg-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" };
    case 'low': return { dot: "bg-zinc-400", text: "text-muted-foreground", bg: "bg-zinc-500/10" };
    default: return { dot: "bg-zinc-600", text: "text-muted-foreground/70", bg: "bg-zinc-600/10" };
  }
}
