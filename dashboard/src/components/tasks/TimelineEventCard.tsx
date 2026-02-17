
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  Code,
  MessageSquare,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

const getEventIcon = (type: string) => {
  switch (type) {
    case "status_change":
      return <CheckCircle className="h-5 w-5" />;
    case "tool_call":
      return <Code className="h-5 w-5" />;
    case "internal_message":
      return <MessageSquare className="h-5 w-5" />;
    case "zombie_alert":
      return <AlertTriangle className="h-5 w-5" />;
    case "cost_accumulation":
        return <DollarSign className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
};

export function TimelineEventCard({ event }: { event: any }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getEventIcon(event.type)}
          <span className="capitalize">{event.type.replace("_", " ")}</span>
          <span className="text-sm text-muted-foreground ml-auto">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted text-foreground p-2 rounded text-xs overflow-auto">
          {JSON.stringify(event, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
