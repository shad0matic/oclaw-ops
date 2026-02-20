#!/bin/bash
set -e

# Self-locating paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_DIR="$HOME/.openclaw"

cd "$PROJECT_DIR/dashboard"

echo "🔨 Rebuilding dashboard..."
npx next build 2>&1

echo "🔄 Restarting service..."
systemctl --user restart oclaw-dashboard
sleep 10

echo "🔍 Running smoke test..."
bash "$SCRIPT_DIR/smoke-test.sh"

echo "✅ Nightly build complete"
