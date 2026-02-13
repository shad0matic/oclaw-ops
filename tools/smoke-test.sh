#!/bin/bash
# Quick API smoke test for MC dashboard — no browser needed
# Usage: ./tools/smoke-test.sh [base_url]
# Exit 0 = all clear, Exit 1 = something broke

BASE="${1:-http://localhost:3100}"
PASS=0
FAIL=0
ERRORS=""

check() {
  local name="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE$url" 2>/dev/null)
  
  if [ "$code" = "$expect" ]; then
    echo "✅ $name → HTTP $code"
    PASS=$((PASS + 1))
  else
    echo "❌ $name → HTTP $code (expected $expect)"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $name: got $code, expected $expect"
  fi
}

check_not_500() {
  local name="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE$url" 2>/dev/null)
  
  if [ "$code" != "500" ] && [ "$code" != "000" ]; then
    echo "✅ $name → HTTP $code (not 500)"
    PASS=$((PASS + 1))
  else
    echo "❌ $name → HTTP $code"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $name: got $code"
  fi
}

check_json() {
  local name="$1" url="$2"
  local body
  body=$(curl -s --max-time 10 "$BASE$url" 2>/dev/null)
  local code=$?
  
  if [ $code -eq 0 ] && echo "$body" | python3 -m json.tool > /dev/null 2>&1; then
    echo "✅ $name → valid JSON"
    PASS=$((PASS + 1))
  else
    echo "❌ $name → invalid response"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $name: not valid JSON"
  fi
}

echo "🔍 MC Dashboard Smoke Test — $BASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# API endpoints (no auth needed)
check "Tasks Queue API" "/api/tasks/queue" "200"
check_json "Tasks Queue JSON" "/api/tasks/queue"
check "Projects API" "/api/projects" "200"
check "Tasks Backlog API" "/api/tasks/backlog" "200"
check_not_500 "System Health API" "/api/system/health"

# Auth-protected endpoints (401 = OK, 500 = BAD)  
check_not_500 "Overview API" "/api/overview"
check_not_500 "Agents API" "/api/agents"
check_not_500 "Events API" "/api/events"
check_not_500 "Runs API" "/api/runs"

# Pages (redirect to login = fine)
check_not_500 "Homepage" "/"
check_not_500 "Tasks Page" "/tasks"
check_not_500 "Login Page" "/login"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
  echo -e "\n❌ FAILURES:$ERRORS"
  exit 1
fi

echo "All clear! 🍌"
exit 0
