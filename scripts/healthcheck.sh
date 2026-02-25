#!/bin/bash

# =============================================================================
# OpenClaw Ops - Health Check Script
# =============================================================================
# Checks if all services are healthy
# =============================================================================

set -e

# --- Configuration ---
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3000}"
TIMEOUT=5

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Functions ---
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

check_dashboard() {
    log_info "Checking dashboard..."
    
    if curl -sf --max-time $TIMEOUT "$DASHBOARD_URL/api/health" > /dev/null 2>&1; then
        log_success "Dashboard is healthy"
        return 0
    elif curl -sf --max-time $TIMEOUT "$DASHBOARD_URL" > /dev/null 2>&1; then
        log_success "Dashboard is responding (no health endpoint)"
        return 0
    else
        log_fail "Dashboard is not responding"
        return 1
    fi
}

check_database() {
    log_info "Checking database..."
    
    # Try to connect to the database
    if command -v psql &> /dev/null; then
        if psql -d openclaw_db -c "SELECT 1" > /dev/null 2>&1; then
            log_success "Database is healthy"
            return 0
        else
            log_fail "Database is not responding"
            return 1
        fi
    else
        log_info "psql not available, skipping database check"
        return 0
    fi
}

check_docker() {
    log_info "Checking Docker services..."
    
    if ! command -v docker &> /dev/null; then
        log_fail "Docker is not installed"
        return 1
    fi
    
    # Check if containers are running
    local running=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E "(dashboard|postgres|gateway)" || true)
    
    if [ -n "$running" ]; then
        log_success "Docker containers running: $running"
        return 0
    else
        log_fail "No OpenClaw containers are running"
        return 1
    fi
}

# --- Main ---
echo "============================================"
echo "OpenClaw Ops - Health Check"
echo "============================================"
echo ""

FAILED=0

check_dashboard || FAILED=1
check_database || FAILED=1
check_docker || FAILED=1

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed!${NC}"
    exit 1
fi
