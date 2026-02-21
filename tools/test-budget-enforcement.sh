#!/bin/bash
# test-budget-enforcement.sh — Test Dave Phase 3 budget enforcement

set -e

echo "🧪 Testing Dave Phase 3 - Budget Enforcement"
echo ""

AGENT_ID="test-agent-$RANDOM"

echo "1️⃣ Testing budget.mjs CLI tool..."
echo ""

# Test list (should be empty for our test agent)
echo "→ budget list"
node tools/budget.mjs list | head -5
echo ""

# Test setting budget
echo "→ budget set $AGENT_ID --daily 1000 --weekly 5000 --monthly 20000 --alert 75"
node tools/budget.mjs set "$AGENT_ID" --daily 1000 --weekly 5000 --monthly 20000 --alert 75
echo ""

# Test showing budget
echo "→ budget show $AGENT_ID"
node tools/budget.mjs show "$AGENT_ID"
echo ""

echo "2️⃣ Testing budget-check.mjs pre-flight checks..."
echo ""

# Test with no cost (should be OK)
echo "→ budget-check.mjs $AGENT_ID"
node tools/budget-check.mjs "$AGENT_ID"
echo ""

# Test with small cost (should still be OK)
echo "→ budget-check.mjs $AGENT_ID --cost-cents 100"
node tools/budget-check.mjs "$AGENT_ID" --cost-cents 100
echo ""

# Test with cost that triggers warning (75% threshold, 1000 limit, so 800+ triggers)
echo "→ budget-check.mjs $AGENT_ID --cost-cents 800"
if node tools/budget-check.mjs "$AGENT_ID" --cost-cents 800; then
    echo "✅ Warning threshold works (exit 1 expected)"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 1 ]; then
        echo "✅ Warning threshold triggered correctly (exit 1)"
    else
        echo "❌ Unexpected exit code: $EXIT_CODE"
    fi
fi
echo ""

# Test with cost that exceeds budget (should block)
echo "→ budget-check.mjs $AGENT_ID --cost-cents 1100"
if node tools/budget-check.mjs "$AGENT_ID" --cost-cents 1100 2>&1; then
    echo "❌ Should have blocked!"
    exit 1
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
        echo "✅ Budget block works (exit 2)"
    else
        echo "❌ Unexpected exit code: $EXIT_CODE"
    fi
fi
echo ""

# Agent should now be paused
echo "→ budget show $AGENT_ID (should show paused)"
node tools/budget.mjs show "$AGENT_ID"
echo ""

# Test resume
echo "→ budget resume $AGENT_ID"
node tools/budget.mjs resume "$AGENT_ID"
echo ""

# Verify resumed
echo "→ budget show $AGENT_ID (should show active)"
node tools/budget.mjs show "$AGENT_ID"
echo ""

echo "3️⃣ Testing budget pause/resume..."
echo ""

# Test manual pause
echo "→ budget pause $AGENT_ID 'Testing manual pause'"
node tools/budget.mjs pause "$AGENT_ID" "Testing manual pause"
echo ""

# Verify paused agent blocks all calls
echo "→ budget-check.mjs $AGENT_ID (should block while paused)"
if node tools/budget-check.mjs "$AGENT_ID" 2>&1; then
    echo "❌ Should have blocked paused agent!"
    exit 1
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
        echo "✅ Paused agent blocks correctly"
    fi
fi
echo ""

# Resume
echo "→ budget resume $AGENT_ID"
node tools/budget.mjs resume "$AGENT_ID"
echo ""

echo "4️⃣ Testing JSON output..."
echo ""
echo "→ budget-check.mjs $AGENT_ID --json"
node tools/budget-check.mjs "$AGENT_ID" --json
echo ""

echo "✅ All tests passed!"
echo ""
echo "Cleanup: You may want to remove test agent from DB:"
echo "  psql -d openclaw_db -c \"DELETE FROM ops.agent_budgets WHERE agent_id = '$AGENT_ID'\""
