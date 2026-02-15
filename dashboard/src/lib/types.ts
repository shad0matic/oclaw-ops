
export interface Task {
    id: number;
    title: string;
    description: string | null;
    project: string;
    agentId: string | null;
    priority: number;
    status: 'queued' | 'assigned' | 'planned' | 'running' | 'review' | 'human_todo' | 'done' | 'failed' | 'cancelled';
    createdBy: string;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    epic: string | null;
  }
  