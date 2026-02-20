-- Schema for ops.kanban_notification_queue table

CREATE TABLE IF NOT EXISTS ops.kanban_notification_queue (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    task_id INT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    batch_id UUID
);

CREATE INDEX IF NOT EXISTS idx_kanban_notification_queue_processed_at ON ops.kanban_notification_queue (processed_at);
