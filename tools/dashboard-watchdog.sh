#!/bin/bash
# Dashboard watchdog — checks if dashboard responds, rebuilds + restarts if down
# Run via crontab every minute

LOCK="/tmp/dashboard-watchdog.lock"
DASH_DIR="/home/shad/projects/oclaw-ops/dashboard"

# Prevent concurrent runs
if [ -f "$LOCK" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
    if [ "$LOCK_AGE" -lt 300 ]; then
        exit 0  # Another watchdog is running (< 5min old)
    fi
    rm -f "$LOCK"  # Stale lock
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/ 2>/dev/null)

if [ "$STATUS" = "307" ] || [ "$STATUS" = "200" ]; then
    exit 0
fi

echo "$(date): Dashboard down (HTTP $STATUS), rebuilding..."
touch "$LOCK"

cd "$DASH_DIR" || { rm -f "$LOCK"; exit 1; }

# Clean stale build artifacts and rebuild
rm -rf .next/lock
if npx next build > /tmp/dashboard-rebuild.log 2>&1; then
    echo "$(date): Build succeeded, restarting..."
    systemctl --user restart oclaw-dashboard
    sleep 3
    NEW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/ 2>/dev/null)
    echo "$(date): Restarted, status: $NEW_STATUS"
else
    echo "$(date): Build FAILED — check /tmp/dashboard-rebuild.log"
fi

rm -f "$LOCK"
