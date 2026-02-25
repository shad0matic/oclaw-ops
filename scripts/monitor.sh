#!/bin/bash

# =============================================================================
# OpenClaw Ops - Health Monitoring Script
# =============================================================================
# Monitors the health of all services and alerts on failures
# Can be run via cron or as a continuous monitor
# Usage: ./monitor.sh [--continuous] [--alert]
# =============================================================================

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTINUOUS=false
ALERT_ON_FAILURE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --alert)
            ALERT_ON_FAILURE=true
            shift
            ;;
    esac
done

# --- Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# --- Check Dashboard ---
check_dashboard() {
    if curl -sf --max-time 10 http://localhost:3000/health &> /dev/null || \
       curl -sf --max-time 10 http://localhost:3000/api/health &> /dev/null; then
        log_success "Dashboard: healthy"
        return 0
    else
        log_error "Dashboard: unhealthy"
        return 1
    fi
}

# --- Check Database ---
check_database() {
    if docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres pg_isready -U shad &> /dev/null; then
        log_success "Database: healthy"
        return 0
    else
        log_error "Database: unhealthy"
        return 1
    fi
}

# --- Check Gateway ---
check_gateway() {
    if curl -sf --max-time 10 http://localhost:8080/health &> /dev/null || \
       curl -sf --max-time 10 http://localhost:8080/api/status &> /dev/null; then
        log_success "Gateway: healthy"
        return 0
    else
        log_error "Gateway: unhealthy"
        return 1
    fi
}

# --- Check Disk Space ---
check_disk() {
    local USAGE=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$USAGE" -lt 80 ]; then
        log_success "Disk: ${USAGE}% used"
        return 0
    elif [ "$USAGE" -lt 90 ]; then
        log_warning "Disk: ${USAGE}% used"
        return 0
    else
        log_error "Disk: ${USAGE}% used (critical)"
        return 1
    fi
}

# --- Check Memory ---
check_memory() {
    local USAGE=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    if [ "$USAGE" -lt 80 ]; then
        log_success "Memory: ${USAGE}% used"
        return 0
    elif [ "$USAGE" -lt 90 ]; then
        log_warning "Memory: ${USAGE}% used"
        return 0
    else
        log_error "Memory: ${USAGE}% used (critical)"
        return 1
    fi
}

# --- Check Container Status ---
check_containers() {
    local FAILED=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --format json 2>/dev/null | \
        grep -c '"running"' || echo "0")
    
    if [ "$FAILED" -eq 0 ]; then
        log_success "Containers: all running"
        return 0
    else
        log_warning "Containers: $FAILED not running"
        return 1
    fi
}

# --- Send Alert ---
send_alert() {
    local MESSAGE="$1"
    
    if [ "$ALERT_ON_FAILURE" = true ]; then
        log_info "Alert: $MESSAGE"
        # Add your alerting mechanism here (Telegram, email, etc.)
        # Example: curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        #     -d "chat_id=$CHAT_ID" -d "text=$MESSAGE"
    fi
}

# --- Run Health Checks ---
run_checks() {
    echo "============================================"
    echo "OpenClaw Ops - Health Monitor"
    echo "============================================"
    echo ""
    
    local FAILED=0
    
    check_dashboard || { FAILED=$((FAILED + 1)); send_alert "Dashboard is down"; }
    check_database || { FAILED=$((FAILED + 1)); send_alert "Database is down"; }
    check_gateway || { FAILED=$((FAILED + 1)); send_alert "Gateway is down"; }
    check_disk || { FAILED=$((FAILED + 1)); send_alert "Disk space is low"; }
    check_memory || { FAILED=$((FAILED + 1)); send_alert "Memory is running low"; }
    check_containers || { FAILED=$((FAILED + 1)); send_alert "Some containers are not running"; }
    
    echo ""
    
    if [ "$FAILED" -eq 0 ]; then
        log_success "All checks passed"
        return 0
    else
        log_error "$FAILED check(s) failed"
        return 1
    fi
}

# --- Main ---
main() {
    if [ "$CONTINUOUS" = true ]; then
        log_info "Running continuous monitoring (Ctrl+C to stop)..."
        while true; do
            run_checks
            sleep 60
        done
    else
        run_checks
    fi
}

main "$@"
