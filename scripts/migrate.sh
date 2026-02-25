#!/bin/bash

# =============================================================================
# OpenClaw Ops - Database Migration Script
# =============================================================================
# Runs database migrations using Drizzle ORM
# Usage: ./migrate.sh [up|down|status]
# =============================================================================

set -e

# --- Configuration ---
DASHBOARD_DIR="${DASHBOARD_DIR:-~/projects/oclaw-ops/dashboard}"
MIGRATION_DIR="$DASHBOARD_DIR/drizzle"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Functions ---
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Main ---
ACTION="${1:-status}"

cd "$DASHBOARD_DIR"

# Check if drizzle-kit is installed
if ! npm list drizzle-kit &> /dev/null; then
    log_info "Installing drizzle-kit..."
    npm install drizzle-kit
fi

case "$ACTION" in
    up)
        log_info "Running migrations..."
        npx drizzle-kit push
        log_success "Migrations complete"
        ;;
    down)
        log_info "Rolling back migrations..."
        npx drizzle-kit drop
        log_success "Rollback complete"
        ;;
    status)
        log_info "Checking migration status..."
        npx drizzle-kit generate --dry-run
        ;;
    *)
        log_error "Unknown action: $ACTION"
        echo "Usage: $0 [up|down|status]"
        exit 1
        ;;
esac
