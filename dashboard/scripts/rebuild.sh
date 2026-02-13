#!/bin/bash
# MC Dashboard — Clean rebuild + restart + smoke test
# Usage: bash scripts/rebuild.sh
# ONLY Kevin (main agent) may run this. Sub-agents: commit code only, Kevin builds.

set -euo pipefail

DASH_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DASH_DIR"

echo "🧹 Stopping dashboard..."
systemctl --user stop oclaw-dashboard 2>/dev/null || true

echo "🗑️  Wiping .next cache..."
rm -rf .next

echo "🔨 Building..."
if ! npx next build 2>&1; then
  echo "❌ BUILD FAILED — dashboard NOT restarted"
  exit 1
fi

echo "🚀 Starting dashboard..."
systemctl --user start oclaw-dashboard
sleep 5

echo "🧪 Smoke test..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/ 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Dashboard up (HTTP $HTTP_CODE)"
else
  echo "❌ Dashboard NOT responding (HTTP $HTTP_CODE)"
  echo "Check: journalctl --user -u oclaw-dashboard -n 20 --no-pager"
  exit 1
fi

# API smoke test
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/overview 2>/dev/null || echo "000")
echo "📡 API /overview: HTTP $API_CODE"

echo "🎉 Done!"
