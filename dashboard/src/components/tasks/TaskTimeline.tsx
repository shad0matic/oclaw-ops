
import { TimelineEventCard } from "./TimelineEventCard";

interface TaskTimelineProps {
  events: any[]; // Replace with a proper type later
}

export function TaskTimeline({ events }: TaskTimelineProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Timeline</h2>
      {events.map((event, index) => (
        <TimelineEventCard key={index} event={event} />
      ))}
    </div>
  );
}
