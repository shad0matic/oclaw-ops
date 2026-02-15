"use client";

import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { AgentAvatar } from "@/components/ui/agent-avatar";

type TaskDetailResponse = {
  task: {
    id: number;
    title?: string;
    description?: string;
    status?: string;
    agentId?: string;
    priority?: number;
    [key: string]: any;
  };
  timeline: Array<{
    id: number | string;
    agentId?: string;
    agentName?: string;
    eventType: string;
    detail?: string;
    costUsd?: number;
    tokensUsed?: number;
    createdAt: string;
  }>;
  stats: {
    totalCost?: number;
    totalTokens?: number;
    durationSeconds?: number;
    involvedAgents?: Array<{ id: string; name?: string }>;
    eventCount?: number;
  };
  spawns?: Array<{
    agentId: string;
    agentName?: string;
    model?: string;
    spawnedBy?: string;
    at: string;
  }>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function labelEventType(eventType: string) {
  const clean = (eventType || "").replace(/^task_/, "");
  return clean.replace(/_/g, " ");
}

function dotColor(eventType: string) {
  switch (eventType) {
    case "task_start":
      return "bg-blue-500";
    case "task_complete":
      return "bg-emerald-500";
    case "task_fail":
      return "bg-red-500";
    case "task_progress":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function TaskDetailView({ taskId }: { taskId: number }) {
  const { data, error, isLoading } = useSWR<TaskDetailResponse>(
    `/api/tasks/queue/${taskId}/detail`,
    fetcher,
    { refreshInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card/40 p-4">
        <div className="text-sm text-muted-foreground">Loading task details…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card/40 p-4">
        <div className="text-sm text-red-400">Failed to load task details.</div>
      </div>
    );
  }

  if (!data) return null;

  const stats = data.stats || {};
  const involved = stats.involvedAgents || [];
  const spawns = data.spawns || [];

  return (
    <div className="mt-6 space-y-4">
      {/* Stats bar */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill label="Duration" value={formatDuration(stats.durationSeconds)} />
            {Number(stats.totalCost || 0) > 0 && (
              <StatPill label="Cost" value={`$${Number(stats.totalCost || 0).toFixed(2)}`} />
            )}
            <StatPill label="Tokens" value={Number(stats.totalTokens || 0).toLocaleString()} />
            <StatPill label="Events" value={Number(stats.eventCount || data.timeline?.length || 0)} />
          </div>

          {involved.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Involved</span>
              <div className="flex flex-wrap gap-2">
                {involved.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-2 py-1"
                  >
                    <AgentAvatar agentId={a.id} size={18} />
                    <span className="text-xs text-foreground/90">{a.name || a.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Timeline</h4>
          <span className="text-xs text-muted-foreground">auto-refresh 30s</span>
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-4">
            {(data.timeline || []).map((ev, idx) => {
              const last = idx === (data.timeline?.length || 0) - 1;
              const agentLabel = ev.agentName || ev.agentId || "Unknown";
              return (
                <div key={String(ev.id)} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColor(ev.eventType)}`} />
                    {!last && <div className="mt-1 h-full w-px bg-border" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-medium text-foreground">{agentLabel}</span>
                      <span className="text-[11px] text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{labelEventType(ev.eventType)}</span>
                      <span className="text-[11px] text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(ev.createdAt)}</span>
                    </div>

                    {ev.detail && (
                      <p className="mt-1 line-clamp-3 text-xs text-foreground/80">
                        {typeof ev.detail === 'string' ? ev.detail : JSON.stringify(ev.detail)}
                      </p>
                    )}

                    {(Number(ev.costUsd || 0) > 0 || Number(ev.tokensUsed || 0) > 0) && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {Number(ev.costUsd || 0) > 0 && <span>Cost ${Number(ev.costUsd).toFixed(4)}</span>}
                        {Number(ev.tokensUsed || 0) > 0 && (
                          <span>Tokens {Number(ev.tokensUsed).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(data.timeline || []).length === 0 && (
              <div className="text-xs text-muted-foreground">No timeline events yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-agents */}
      {spawns.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Sub-agents</h4>
          <div className="grid gap-2">
            {spawns.map((s) => (
              <div
                key={`${s.agentId}-${s.at}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
              >
                <AgentAvatar agentId={s.agentId} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">{s.agentName || s.agentId}</span>
                    {s.model && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {s.model}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {s.spawnedBy && (
                      <>
                        <span>spawned by</span>
                        <Link
                          href={`/agents/${s.spawnedBy}`}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {s.spawnedBy}
                        </Link>
                      </>
                    )}
                    <span className="text-[11px]">•</span>
                    <span>{relativeTime(s.at)}</span>
                  </div>
                </div>
                <Link
                  href={`/agents/${s.agentId}`}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
