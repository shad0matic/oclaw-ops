
import { notFound } from 'next/navigation';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';

async function getTaskDetails(id: string) {
  // TODO: Replace with actual API call
  const MOCK_DATA = {
    task: {
      id: "6e3f8b21-28a1-468f-a2e6-9b3b8b1b2a6f",
      title: "Refactor the authentication module",
      status: "in_progress",
      assignedAgent: { id: "a1b2c3d4", name: "Bob" },
      project: "oclaw-ops",
      createdAt: "2026-02-12T10:00:00Z",
      durationMs: 3600000,
      tokenUsage: 125000,
      actualCost: 0.95,
      model: "google/gemini-2.5-pro",
      timeline: [
        { type: "status_change", timestamp: "2026-02-12T10:00:00Z", status: "planned" },
        { type: "status_change", timestamp: "2026-02-12T10:05:00Z", status: "running" },
        { type: "tool_call", timestamp: "2026-02-12T10:15:00Z", tool: "exec", command: "npm install" },
        { type: "internal_message", timestamp: "2026-02-12T10:30:00Z", from: "Bob", to: "Kevin", message: "Ready for review." },
        { type: "review_request", timestamp: "2026-02-12T10:31:00Z", reviewer: "Kevin", status: "pending" },
        { type: "feedback", timestamp: "2026-02-12T11:05:00Z", from: "Kevin", approved: false, comment: "Please add more tests." },
        { type: "zombie_alert", timestamp: "2026-02-12T11:15:00Z", heuristic: "stuck_loop" }
      ],
      subAgents: [
        { id: "s1b2c3d4", name: "TestWriterAgent", status: "completed", runId: "sub-run-1" }
      ]
    }
  };
  return MOCK_DATA;
}

export default async function TaskDetailsPage({ params }: { params: { id: string } }) {
  const data = await getTaskDetails(params.id);

  if (!data) {
    notFound();
  }

  const { task } = data;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <TaskHeader task={task} />
      <TaskTimeline events={task.timeline} />
    </div>
  );
}
