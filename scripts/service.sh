#!/bin/bash

# =============================================================================
# OpenClaw Ops - Service Management Script
# =============================================================================
# Manage OpenClaw services
# Usage: ./service.sh [start|stop|restart|status|logs] [service]
# =============================================================================

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# --- Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# --- Start Services ---
start_services() {
    local SERVICE="${1:-all}"
    
    log_info "Starting services..."
    cd "$PROJECT_DIR"
    
    if [ "$SERVICE" = "all" ]; then
        docker compose up -d
    else
        docker compose up -d "$SERVICE"
    fi
    
    log_success "Services started"
}

# --- Stop Services ---
stop_services() {
    local SERVICE="${1:-all}"
    
    log_info "Stopping services..."
    cd "$PROJECT_DIR"
    
    if [ "$SERVICE" = "all" ]; then
        docker compose down
    else
        docker compose stop "$SERVICE"
    fi
    
    log_success "Services stopped"
}

# --- Restart Services ---
restart_services() {
    local SERVICE="${1:-all}"
    
    log_info "Restarting services..."
    cd "$PROJECT_DIR"
    
    if [ "$SERVICE" = "all" ]; then
        docker compose restart
    else
        docker compose restart "$SERVICE"
    fi
    
    log_success "Services restarted"
}

# --- Show Status ---
show_status() {
    log_info "Service Status:"
    echo ""
    cd "$PROJECT_DIR"
    docker compose ps
    echo ""
    
    # Show resource usage
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# --- Show Logs ---
show_logs() {
    local SERVICE="${1:-all}"
    local LINES="${2:-100}"
    
    cd "$PROJECT_DIR"
    
    if [ "$SERVICE" = "all" ]; then
        docker compose logs --tail="$LINES" -f
    else
        docker compose logs --tail="$LINES" -f "$SERVICE"
    fi
}

# --- Show Version Info ---
show_version() {
    log_info "Version Information:"
    echo ""
    
    # Docker Compose version
    echo -e "${CYAN}Docker Compose:${NC} $(docker compose version 2>/dev/null || echo 'N/A')"
    
    # Dashboard version
    if [ -f "$PROJECT_DIR/dashboard/package.json" ]; then
        echo -e "${CYAN}Dashboard:${NC} $(grep '"version"' "$PROJECT_DIR/dashboard/package.json" | cut -d'"' -f4)"
    fi
    
    # Node version
    if command -v node &> /dev/null; then
        echo -e "${CYAN}Node.js:${NC} $(node --version)"
    fi
    
    echo ""
}

# --- Main ---
main() {
    local COMMAND="${1:-status}"
    local ARG="${2:-}"
    
    echo "============================================"
    echo "OpenClaw Ops - Service Manager"
    echo "============================================"
    echo ""
    
    case "$COMMAND" in
        start)
            start_services "$ARG"
            ;;
        stop)
            stop_services "$ARG"
            ;;
        restart)
            restart_services "$ARG"
            ;;
        status)
            show_status
            show_version
            ;;
        logs)
            show_logs "$ARG" "${3:-100}"
            ;;
        ps)
            docker compose ps
            ;;
        version|v)
            show_version
            ;;
        *)
            echo "Usage: $0 [command] [service] [lines]"
            echo ""
            echo "Commands:"
            echo "  start [service]    Start services (default: all)"
            echo "  stop [service]     Stop services (default: all)"
            echo "  restart [service]  Restart services (default: all)"
            echo "  status              Show service status and resources"
            echo "  logs [service]      Show logs (default: all, 100 lines)"
            echo "  ps                  Show container status"
            echo "  version             Show version info"
            echo ""
            echo "Services:"
            echo "  dashboard, postgres, openclaw-gateway, gog-gmail-watch"
            exit 1
            ;;
    esac
}

main "$@"
