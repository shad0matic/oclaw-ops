#!/bin/bash
# Safe dashboard deploy — stop server, build, start
# Use this instead of raw `next build && systemctl restart`
set -e

DASH_DIR="/home/shad/projects/oclaw-ops/dashboard"
cd "$DASH_DIR"

echo "Stopping dashboard..."
systemctl --user stop oclaw-dashboard 2>/dev/null || true
sleep 2

# Force kill if still running
pkill -f "next start -p 3100" 2>/dev/null || true
sleep 1

echo "Building (clean)..."
rm -rf .next
npx next build

echo "Starting dashboard..."
systemctl --user start oclaw-dashboard
sleep 2

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3100/ 2>/dev/null)
echo "Dashboard status: HTTP $STATUS"

if [ "$STATUS" = "307" ] || [ "$STATUS" = "200" ]; then
    echo "✅ Deploy successful"
else
    echo "❌ Deploy failed — check journalctl"
    exit 1
fi
