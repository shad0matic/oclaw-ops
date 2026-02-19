#!/bin/bash
set -e
cd /home/openclaw/projects/oclaw-ops/dashboard

echo "🔨 Rebuilding dashboard..."
npx next build 2>&1

echo "🔄 Restarting service..."
systemctl --user restart oclaw-dashboard
sleep 10

echo "🔍 Running smoke test..."
bash /home/openclaw/projects/oclaw-ops/tools/smoke-test.sh

echo "✅ Nightly build complete"
