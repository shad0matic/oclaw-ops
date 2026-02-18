#!/usr/bin/env python3
"""
Incremental bookmark sync from X/Twitter to OpenClaw database.
Fetches bookmarks and upserts them into kb.x_bookmarks table.
Uses ON CONFLICT for safe incremental updates.
"""

import json
import subprocess
import sys
import os
from datetime import datetime, timezone

def get_db_connection():
    """Return psql command base."""
    return ["psql", "-U", "shad", "openclaw_db", "-t"]

def fetch_bookmarks(count=100):
    """Fetch bookmarks using birdx with a count limit."""
    print(f"📥 Fetching {count} bookmarks from X/Twitter...", file=sys.stderr)
    try:
        cmd = ["birdx", "bookmarks", "-n", str(count), "--json"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode != 0:
            print(f"❌ birdx error: {result.stderr}", file=sys.stderr)
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
    
    # Allow override via CLI: sync-x-bookmarks.py [count]
    count = 200
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            print(f"❌ Invalid count: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)
    
    # Try to fetch bookmarks with specified limit
    bookmarks = fetch_bookmarks(count=count)
    if bookmarks is None:
        sys.exit(1)
    
    if not bookmarks:
        print("⚠️  No bookmarks to sync", file=sys.stderr)
        sys.exit(0)
    
    # Generate SQL
    sql = generate_upsert_sql(bookmarks)
    if not sql:
        print("❌ Failed to generate SQL", file=sys.stderr)
        sys.exit(1)
    
    print(f"💾 Upserting {len(bookmarks)} bookmarks...", file=sys.stderr)
    
    # Execute SQL
    try:
        result = subprocess.run(
            ["psql", "-U", "shad", "openclaw_db"],
            input=sql,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            print(f"❌ Database error: {result.stderr}", file=sys.stderr)
            sys.exit(1)
        
        # Parse output to get total count
        lines = result.stdout.strip().split('\n')
        if lines:
            total_in_db = lines[-1].strip()
            print(f"\n✅ Sync complete!", file=sys.stderr)
            print(f"   - Fetched: {len(bookmarks)}", file=sys.stderr)
            print(f"   - Processed: {len(bookmarks)}", file=sys.stderr)
            print(f"   - Total in DB: {total_in_db}", file=sys.stderr)
        
    except subprocess.TimeoutExpired:
        print("❌ Database operation timed out", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
