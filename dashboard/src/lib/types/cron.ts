
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  model: string;
  prompt: string;
  channel: string;
  owner: string;
  enabled: boolean;
  human_schedule: string;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export interface CronRun {
  id: string;
  job_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  status: 'succeeded' | 'failed' | 'running';
  log: string;
}
