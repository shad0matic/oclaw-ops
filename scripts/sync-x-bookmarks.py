#!/usr/bin/env python3
"""
Incremental bookmark sync from X/Twitter to OpenClaw database.
Fetches bookmarks and upserts them into kb.x_bookmarks table.
Uses ON CONFLICT for safe incremental updates.
Tracks sync runs in ops.task_queue.
"""

import json
import subprocess
import sys
import os
import fcntl
import atexit
from datetime import datetime, timezone

LOCK_FILE = "/tmp/smaug-sync.lock"
lock_fd = None

def acquire_lock():
    """Acquire exclusive lock. Returns False if another sync is running."""
    global lock_fd
    try:
        lock_fd = open(LOCK_FILE, 'w')
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        lock_fd.write(str(os.getpid()))
        lock_fd.flush()
        atexit.register(release_lock)
        return True
    except (IOError, OSError):
        return False

def release_lock():
    """Release the lock."""
    global lock_fd
    if lock_fd:
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            lock_fd.close()
            os.unlink(LOCK_FILE)
        except:
            pass
        lock_fd = None

def get_running_pid():
    """Check if another sync is running and return its PID."""
    try:
        if os.path.exists(LOCK_FILE):
            with open(LOCK_FILE, 'r') as f:
                pid = int(f.read().strip())
                # Check if process is still running
                os.kill(pid, 0)
                return pid
    except (ValueError, OSError, ProcessLookupError):
        pass
    return None

def get_db_connection():
    """Return psql command base."""
    return ["psql", "-U", "openclaw", "openclaw_db", "-t"]

def get_running_task():
    """Check if there's already a running Smaug sync task."""
    sql = """
SELECT id FROM ops.task_queue 
WHERE agent_id = 'smaug' 
  AND status = 'running'
  AND started_at > NOW() - INTERVAL '10 minutes'
ORDER BY started_at DESC
LIMIT 1;
"""
    try:
        result = subprocess.run(
            ["psql", "-U", "openclaw", "openclaw_db", "-t"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return int(result.stdout.strip())
    except:
        pass
    return None

def create_task():
    """Create a task in ops.task_queue and return the task id. Reuses running task if exists."""
    # Check for existing running task first
    existing = get_running_task()
    if existing:
        print(f"✓ Reusing existing task #{existing}", file=sys.stderr)
        return existing
    
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    
    sql = f"""
INSERT INTO ops.task_queue 
(title, description, status, agent_id, project, started_at)
VALUES
('Smaug: X bookmark sync [{date_str}]', 'Syncing X bookmarks...', 'running', 'smaug', 'smaug', NOW())
RETURNING id;
"""
    
    try:
        result = subprocess.run(
            ["psql", "-U", "openclaw", "openclaw_db", "-t"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"❌ Failed to create task: {result.stderr}", file=sys.stderr)
            return None
        
        task_id = result.stdout.strip()
        if task_id:
            print(f"✓ Created task #{task_id}", file=sys.stderr)
            return task_id
        return None
    except Exception as e:
        print(f"❌ Error creating task: {e}", file=sys.stderr)
        return None

def update_task_success(task_id, fetched_count, total_in_db):
    """Mark task as done with sync stats."""
    if not task_id:
        return
    
    description = f"Synced X bookmarks. Fetched: {fetched_count}, Total in DB: {total_in_db}"
    # Escape description for SQL
    safe_description = description.replace("'", "''")
    
    sql = f"""
UPDATE ops.task_queue 
SET status='done', completed_at=NOW(), description='{safe_description}'
WHERE id = {task_id};
"""
    
    try:
        result = subprocess.run(
            ["psql", "-U", "openclaw", "openclaw_db"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"⚠️  Failed to update task success: {result.stderr}", file=sys.stderr)
        else:
            print(f"✓ Task #{task_id} marked as done", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  Error updating task: {e}", file=sys.stderr)

def update_task_failed(task_id, error_msg):
    """Mark task as failed."""
    if not task_id:
        return
    
    # Escape the error message for SQL
    safe_msg = error_msg.replace("'", "''")
    
    sql = f"""
UPDATE ops.task_queue 
SET status='failed', completed_at=NOW(), description='Sync failed: {safe_msg}'
WHERE id = {task_id};
"""
    
    try:
        result = subprocess.run(
            ["psql", "-U", "openclaw", "openclaw_db"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"⚠️  Failed to update task failed: {result.stderr}", file=sys.stderr)
        else:
            print(f"✓ Task #{task_id} marked as failed", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  Error updating task: {e}", file=sys.stderr)

def save_total_count(total_in_db):
    """Save the total bookmark count to reference file."""
    ref_file = os.path.expanduser("~/.openclaw/smaug-bookmark-total.txt")
    try:
        with open(ref_file, 'w') as f:
            f.write(str(total_in_db))
        print(f"✓ Saved total count ({total_in_db}) to {ref_file}", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  Failed to save total count: {e}", file=sys.stderr)

def fetch_bookmarks(count=100):
    """Fetch bookmarks using bird with a count limit."""
    print(f"📥 Fetching {count} bookmarks from X/Twitter...", file=sys.stderr)
    try:
        cmd = ["bird", "bookmarks", "-n", str(count), "--json"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode != 0:
            print(f"❌ bird error: {result.stderr}", file=sys.stderr)
            return None
        
        bookmarks = json.loads(result.stdout)
        if not isinstance(bookmarks, list):
            print(f"❌ Expected list, got {type(bookmarks)}", file=sys.stderr)
            return None
        
        print(f"✓ Fetched {len(bookmarks)} bookmarks", file=sys.stderr)
        return bookmarks
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout fetching bookmarks (>2 minutes)", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return None

def sql_escape(s):
    """Escape string for SQL."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def generate_upsert_sql(bookmarks):
    """Generate SQL for upserting all bookmarks at once."""
    if not bookmarks:
        return None
    
    values = []
    for bm in bookmarks:
        tweet_id = str(bm.get("id", ""))
        author_id = str(bm.get("authorId", ""))
        author_name = bm.get("author", {}).get("username", "")
        tweet_text = bm.get("text", "")
        full_json = json.dumps(bm)
        url = f"https://x.com/{author_name}/status/{tweet_id}" if author_name and tweet_id else ""
        
        if tweet_id:
            values.append(
                f"({sql_escape(tweet_id)}, {sql_escape(author_id)}, "
                f"{sql_escape(author_name)}, {sql_escape(tweet_text)}, "
                f"{sql_escape(full_json)}::jsonb, {sql_escape(url)})"
            )
    
    if not values:
        return None
    
    sql = f"""
BEGIN;

INSERT INTO kb.x_bookmarks 
(tweet_id, author_id, author_name, tweet_text, full_json, url)
VALUES
{','.join(values)}
ON CONFLICT (tweet_id) DO UPDATE SET
    tweet_text = EXCLUDED.tweet_text,
    full_json = EXCLUDED.full_json,
    author_name = EXCLUDED.author_name,
    archived_at = now();

SELECT COUNT(*) FROM kb.x_bookmarks;

COMMIT;
"""
    return sql

def main():
    """Main sync function."""
    print(f"\n🔄 Starting X Bookmarks Sync at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    
    # Check for concurrent run
    running_pid = get_running_pid()
    if running_pid:
        print(f"⚠️  Another sync is already running (PID {running_pid}). Exiting.", file=sys.stderr)
        sys.exit(2)
    
    # Acquire lock
    if not acquire_lock():
        print("⚠️  Could not acquire lock. Another sync may be starting. Exiting.", file=sys.stderr)
        sys.exit(2)
    
    print("🔒 Lock acquired", file=sys.stderr)
    
    # Create task in queue
    task_id = create_task()
    
    # Allow override via CLI: sync-x-bookmarks.py [count]
    count = 200
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            print(f"❌ Invalid count: {sys.argv[1]}", file=sys.stderr)
            if task_id:
                update_task_failed(task_id, "Invalid count argument")
            sys.exit(1)
    
    # Try to fetch bookmarks with specified limit
    bookmarks = fetch_bookmarks(count=count)
    if bookmarks is None:
        error_msg = "Failed to fetch bookmarks from X/Twitter"
        if task_id:
            update_task_failed(task_id, error_msg)
        sys.exit(1)
    
    if not bookmarks:
        print("⚠️  No bookmarks to sync", file=sys.stderr)
        if task_id:
            update_task_success(task_id, 0, 0)
        sys.exit(0)
    
    # Generate SQL
    sql = generate_upsert_sql(bookmarks)
    if not sql:
        error_msg = "Failed to generate SQL"
        print(f"❌ {error_msg}", file=sys.stderr)
        if task_id:
            update_task_failed(task_id, error_msg)
        sys.exit(1)
    
    print(f"💾 Upserting {len(bookmarks)} bookmarks...", file=sys.stderr)
    
    # Execute SQL
    try:
        result = subprocess.run(
            ["psql", "-U", "openclaw", "openclaw_db"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            error_msg = f"Database error: {result.stderr}"
            print(f"❌ {error_msg}", file=sys.stderr)
            if task_id:
                update_task_failed(task_id, result.stderr)
            sys.exit(1)
        
        # Parse output to get total count
        # The output includes INSERT result and SELECT COUNT result before COMMIT
        lines = result.stdout.strip().split('\n')
        total_in_db = 0
        for line in lines:
            if line and line != 'COMMIT':
                try:
                    # Try to parse as integer (the count result)
                    val = int(line.strip())
                    total_in_db = val
                except ValueError:
                    # Skip non-integer lines (INSERT results, etc.)
                    pass
        
        print(f"\n✅ Sync complete!", file=sys.stderr)
        print(f"   - Fetched: {len(bookmarks)}", file=sys.stderr)
        print(f"   - Processed: {len(bookmarks)}", file=sys.stderr)
        print(f"   - Total in DB: {total_in_db}", file=sys.stderr)
        
        # Save total count to reference file
        save_total_count(total_in_db)
        
        # Mark task as done
        if task_id:
            update_task_success(task_id, len(bookmarks), total_in_db)
        
    except subprocess.TimeoutExpired:
        error_msg = "Database operation timed out"
        print(f"❌ {error_msg}", file=sys.stderr)
        if task_id:
            update_task_failed(task_id, error_msg)
        sys.exit(1)
    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        print(f"❌ {error_msg}", file=sys.stderr)
        if task_id:
            update_task_failed(task_id, str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
