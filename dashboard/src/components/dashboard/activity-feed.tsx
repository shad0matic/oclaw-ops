import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getAgent, getAgentAvatar, getAgentName } from "@/lib/agent-names"

interface Event {
    id: number
    agent_id: string
    event_type: string
    detail: any
    created_at: string
}

interface ActivityFeedProps {
    events: Event[]
}

function formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '';
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
}

function statusBadge(status?: string): { label: string; className: string } {
    switch (status) {
        case 'done':
        case 'complete':
        case 'completed':
        case 'success':
            return { label: '✅ Complete', className: 'bg-green-500/10 text-green-400 border-green-500/20' };
        case 'running':
        case 'in_progress':
            return { label: '🔄 Running', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        case 'error':
        case 'failed':
            return { label: '❌ Failed', className: 'bg-red-500/10 text-red-400 border-red-500/20' };
        case 'stalled':
            return { label: '⏸️ Stalled', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
        default:
            return { label: status || '', className: 'bg-zinc-800 text-zinc-400' };
    }
}

function formatEventSentence(event: Event): { text: string; status?: string } {
    const { event_type, detail } = event;
    const name = getAgentName(event.agent_id);
    const dur = formatDuration(detail?.duration);
    const durStr = dur ? ` for ${dur}` : '';

    switch (event_type) {
        case 'session_spawn':
            return {
                text: `${name} started working on "${detail?.task || 'a new task'}"`,
                status: 'running',
            };
        case 'task_complete':
            return {
                text: `${name} worked on "${detail?.task || 'a task'}"${durStr}`,
                status: detail?.status || 'complete',
            };
        case 'phase_complete':
            return {
                text: `${name} completed phase ${detail?.phase || '?'}: ${detail?.description || 'unknown'}`,
                status: 'complete',
            };
        case 'step_complete':
            return {
                text: `${name} finished a research step${durStr}${detail?.output?.summary ? ` — ${detail.output.summary}` : ''}`,
                status: detail?.status || 'complete',
            };
        case 'run_started':
            return {
                text: `${name} started a new run`,
                status: 'running',
            };
        case 'run_completed':
            return {
                text: `${name} completed a run${durStr}`,
                status: detail?.status || 'complete',
            };
        case 'file_write':
            return {
                text: `${name} wrote to ${detail?.path || 'a file'}`,
                status: 'complete',
            };
        case 'spec_written':
            return {
                text: `${name} finished writing a spec${detail?.path ? ` (${detail.path})` : ''}${durStr}`,
                status: 'complete',
            };
        case 'error':
            return {
                text: `${name} encountered an error: ${detail?.message || detail?.error || 'unknown'}`,
                status: 'failed',
            };
        case 'tool_call':
            return {
                text: `${name} used tool "${detail?.tool || '?'}"${detail?.target ? ` on ${detail.target}` : ''}`,
            };
        case 'heartbeat':
            return {
                text: `${name} ran a heartbeat check${detail?.checks ? ` (${detail.checks.join(', ')})` : ''}`,
                status: detail?.status || 'complete',
            };
        default: {
            // Best-effort: try to make something readable
            const desc = detail?.description || detail?.task || detail?.summary;
            if (desc) {
                return {
                    text: `${name}: ${desc}${durStr}`,
                    status: detail?.status,
                };
            }
            return {
                text: `${name} triggered "${event_type.replace(/_/g, ' ')}"`,
                status: detail?.status,
            };
        }
    }
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
}

export function ActivityFeed({ events }: ActivityFeedProps) {
    return (
        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {events.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                            No recent activity yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {events.map((event) => {
                                const agent = getAgent(event.agent_id);
                                const { text, status } = formatEventSentence(event);
                                const badge = status ? statusBadge(status) : null;

                                return (
                                    <div key={event.id} className="flex items-start gap-3 text-sm border-b border-zinc-800/50 pb-4 last:border-0">
                                        <Avatar className="h-8 w-8 border border-zinc-700 mt-0.5 shrink-0">
                                            <AvatarImage src={getAgentAvatar(event.agent_id)} />
                                            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                                                {agent.emoji}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-white">
                                                    {agent.name}
                                                </span>
                                                {badge && (
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${badge.className}`}>
                                                        {badge.label}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-zinc-500 ml-auto shrink-0">
                                                    {timeAgo(event.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-zinc-400 break-words">
                                                {text}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
