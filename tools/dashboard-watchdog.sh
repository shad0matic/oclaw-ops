#!/bin/bash
# Dashboard watchdog — checks if dashboard responds, rebuilds + restarts if down
# Run via crontab every minute

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/ 2>/dev/null)

if [ "$STATUS" = "307" ] || [ "$STATUS" = "200" ]; then
    exit 0
fi

echo "$(date): Dashboard down (HTTP $STATUS), rebuilding..."

cd /home/shad/projects/oclaw-ops/dashboard || exit 1

# Try build
if npx next build > /tmp/dashboard-rebuild.log 2>&1; then
    echo "$(date): Build succeeded, restarting..."
    systemctl --user restart oclaw-dashboard
    sleep 3
    NEW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/ 2>/dev/null)
    echo "$(date): Restarted, status: $NEW_STATUS"
else
    echo "$(date): Build FAILED, restarting with existing build..."
    systemctl --user restart oclaw-dashboard
fi
