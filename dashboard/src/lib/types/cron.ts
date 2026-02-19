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
  // Extended fields for create/edit
  kind?: 'at' | 'every' | 'cron';
  timezone?: string;
  session_target?: 'main' | 'isolated';
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

export interface CronJobFormData {
  name: string;
  kind: 'at' | 'every' | 'cron';
  schedule: string;
  timezone: string;
  session_target: 'main' | 'isolated';
  prompt: string;
  model: string;
  enabled: boolean;
}

export interface CronTemplate {
  id: string;
  name: string;
  description: string;
  kind: 'at' | 'every' | 'cron';
  schedule: string;
  prompt: string;
  model?: string;
}

export const CRON_TEMPLATES: CronTemplate[] = [
  {
    id: 'daily-standup',
    name: 'Daily Standup',
    description: 'Morning briefing at 8am on weekdays',
    kind: 'cron',
    schedule: '0 8 * * 1-5',
    prompt: "What's on my schedule today? List my priorities and any upcoming deadlines.",
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Week summary on Friday at 5pm',
    kind: 'cron',
    schedule: '0 17 * * 5',
    prompt: "Summarize this week's completed tasks and highlight any blockers or concerns for next week.",
  },
  {
    id: 'cost-check',
    name: 'Daily Cost Check',
    description: 'Monitor API costs at noon daily',
    kind: 'cron',
    schedule: '0 12 * * *',
    prompt: "Check current API costs vs budget. Alert if spending is above expected rate.",
  },
  {
    id: 'hourly-heartbeat',
    name: 'Hourly Heartbeat',
    description: 'System health check every hour',
    kind: 'every',
    schedule: '3600000',
    prompt: "Perform a quick system health check and report any issues.",
  },
];

export const SCHEDULE_PRESETS = [
  { label: 'Every 5 minutes', kind: 'every' as const, value: '300000' },
  { label: 'Every 15 minutes', kind: 'every' as const, value: '900000' },
  { label: 'Every 30 minutes', kind: 'every' as const, value: '1800000' },
  { label: 'Every hour', kind: 'every' as const, value: '3600000' },
  { label: 'Every 6 hours', kind: 'every' as const, value: '21600000' },
  { label: 'Every 12 hours', kind: 'every' as const, value: '43200000' },
  { label: 'Daily at midnight', kind: 'cron' as const, value: '0 0 * * *' },
  { label: 'Daily at 9am', kind: 'cron' as const, value: '0 9 * * *' },
  { label: 'Weekdays at 8am', kind: 'cron' as const, value: '0 8 * * 1-5' },
  { label: 'Weekly on Monday', kind: 'cron' as const, value: '0 9 * * 1' },
];

export const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'UTC', label: 'UTC' },
];
