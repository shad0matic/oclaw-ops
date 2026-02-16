#!/usr/bin/env bash
# Media inbox watcher - spawns Echo when files are detected
# Run via cron every 2 minutes

set -euo pipefail

INBOX_DIR="$HOME/.openclaw/incoming/media"
LOCK_FILE="/tmp/media-watcher.lock"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE")))
    if [ $lock_age -lt 300 ]; then
        echo "Watcher already running (lock age: ${lock_age}s)"
        exit 0
    fi
    echo "Stale lock detected, removing"
    rm -f "$LOCK_FILE"
fi

# Find media files (audio/video)
shopt -s nullglob
files=("$INBOX_DIR"/*.{mp3,m4a,wav,ogg,flac,mp4,mkv,webm,mov,avi} 2>/dev/null)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
    echo "No media files in inbox"
    exit 0
fi

# Create lock
echo "$$" > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Build file list for Echo
file_list=""
for f in "${files[@]}"; do
    file_list="$file_list\n- $(basename "$f")"
done

echo "Found ${#files[@]} file(s), spawning Echo..."

# Spawn Echo via OpenClaw CLI (run locally to avoid gateway auth issues)
openclaw agent --agent echo --local --timeout 600 --message "Process media files in inbox ($INBOX_DIR):
${file_list}

For each file:
1. Transcribe: bash /usr/lib/node_modules/openclaw/skills/openai-whisper-api/scripts/transcribe.sh <file>
2. Log usage: /home/shad/projects/oclaw-ops/tools/scripts/log-whisper-usage.sh <file> echo
3. Move to processed: mv <file> \$HOME/.openclaw/incoming/processed/
4. Save transcript next to processed file

Report summary when complete: files processed, total duration, total cost."

echo "Echo completed processing ${#files[@]} file(s)"
