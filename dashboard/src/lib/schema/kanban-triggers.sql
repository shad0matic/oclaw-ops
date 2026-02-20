-- Slow Lane Trigger for status updates on tasks table
CREATE OR REPLACE FUNCTION ops.notify_kanban_status_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ops.kanban_notification_queue (event_type, task_id, payload)
    VALUES (
        CASE
            WHEN OLD.status != NEW.status THEN 'status_change'
            WHEN OLD.assignee != NEW.assignee THEN 'assignment_change'
            WHEN OLD.priority != NEW.priority THEN 'priority_update'
            ELSE 'other_update'
        END,
        NEW.id,
        jsonb_build_object(
            'from_status', OLD.status,
            'to_status', NEW.status,
            'from_assignee', OLD.assignee,
            'to_assignee', NEW.assignee,
            'from_priority', OLD.priority,
            'to_priority', NEW.priority
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kanban_status_update_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (
    OLD.status != NEW.status OR
    OLD.assignee != NEW.assignee OR
    OLD.priority != NEW.priority
)
EXECUTE FUNCTION ops.notify_kanban_status_update();

-- Fast Lane Trigger for new comments on task_comments table
CREATE OR REPLACE FUNCTION ops.notify_new_task_comment()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_task_comment', jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_task_comment_trigger
AFTER INSERT ON task_comments
FOR EACH ROW
EXECUTE FUNCTION ops.notify_new_task_comment();
