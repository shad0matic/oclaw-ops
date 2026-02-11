import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Event {
    id: number // BigInt serialized
    agent_id: string
    event_type: string
    detail: any
    created_at: string
}

interface ActivityFeedProps {
    events: Event[]
}

function formatEventDetail(event: Event): string {
    const { event_type, detail, agent_id } = event;
    const duration = detail?.duration ? `${(detail.duration / 1000).toFixed(1)}s` : '';

    switch (event_type) {
        case 'session_spawn':
            return `🚀 **${agent_id}** started working on *'${detail?.task || 'a new task'}'*.`;
        case 'file_write':
            return `💾 **${agent_id}** wrote to *'${detail?.path}'*.`;
        case 'spec_written':
            return `📝 **${agent_id}** finished writing spec to *'${detail?.path}'* in ${duration}.`;
        case 'task_complete':
            return `✅ **${agent_id}** completed work on *'${detail?.task || 'a task'}'* in ${duration}. Result: ${detail?.result?.substring(0, 50) || 'complete'}`;
        case 'run_started':
            return `🏃‍♂️ **${agent_id}** started run *'${detail?.runId}'*.`;
        case 'run_completed':
            return `🏁 **${agent_id}** completed run *'${detail?.runId}'*. Status: ${detail?.status}`;
        default:
            const detailString = typeof detail === 'string' ? detail : JSON.stringify(detail);
            return `ℹ️ **${agent_id}** triggered event *'${event_type}'* with details: ${detailString}`;
    }
}

export function ActivityFeed({ events }: ActivityFeedProps) {
    return (
        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="flex items-start gap-4 text-sm border-b border-zinc-800/50 pb-4 last:border-0">
                                <Avatar className="h-8 w-8 border border-zinc-700 mt-1">
                                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                                        {event.agent_id.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">{event.agent_id}</span>
                                        <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
                                            {event.event_type}
                                        </Badge>
                                        <span className="text-xs text-zinc-500">
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="text-zinc-400 max-w-xl break-words">
                                        {formatEventDetail(event)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
