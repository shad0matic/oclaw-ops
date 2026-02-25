#!/bin/bash

# =============================================================================
# OpenClaw Ops - Rollback Script
# =============================================================================
# Rollback to a previous version of the application
# Usage: ./rollback.sh [version|latest]
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
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
VERSION="${1:-latest}"

# --- Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# --- Pre-rollback Checks ---
preflight_checks() {
    log_info "Running pre-rollback checks..."
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check backup exists
    if [ "$VERSION" = "latest" ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/openclaw_db_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$LATEST_BACKUP" ]; then
            log_error "No backups found in $BACKUP_DIR"
            exit 1
        fi
        log_info "Latest backup: $LATEST_BACKUP"
    else
        BACKUP_FILE="$BACKUP_DIR/openclaw_db_${VERSION}.sql.gz"
        if [ ! -f "$BACKUP_FILE" ]; then
            log_error "Backup not found: $BACKUP_FILE"
            exit 1
        fi
    fi
    
    log_success "Pre-rollback checks passed"
}

# --- Create Current State Backup ---
backup_current_state() {
    log_info "Backing up current state before rollback..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    CURRENT_BACKUP="$BACKUP_DIR/pre_rollback_$TIMESTAMP.sql"
    
    if docker compose exec -T postgres pg_dump -U shad -d openclaw_db -F c -b -v -f "$CURRENT_BACKUP" 2>/dev/null; then
        gzip "$CURRENT_BACKUP"
        log_success "Current state backed up: ${CURRENT_BACKUP}.gz"
    else
        log_warning "Failed to backup current state - continuing anyway"
    fi
}

# --- Restore Database ---
restore_database() {
    log_info "Restoring database..."
    
    # Stop dashboard to prevent writes
    log_info "Stopping dashboard service..."
    docker compose stop dashboard || true
    
    # Drop existing database (must be superuser or use template0)
    log_info "Dropping existing database..."
    docker compose exec -T postgres psql -U shad -d postgres -c "DROP DATABASE IF EXISTS openclaw_db;" 2>/dev/null || true
    docker compose exec -T postgres psql -U shad -d postgres -c "CREATE DATABASE openclaw_db;" 2>/dev/null || true
    
    # Restore from backup
    if [ "$VERSION" = "latest" ]; then
        BACKUP_FILE="$LATEST_BACKUP"
    else
        BACKUP_FILE="$BACKUP_DIR/openclaw_db_${VERSION}.sql.gz"
    fi
    
    log_info "Restoring from: $BACKUP_FILE"
    
    # Copy backup to container
    docker cp "$BACKUP_FILE" postgres:/tmp/rollback_backup.sql.gz
    
    # Restore
    docker compose exec -T postgres psql -U shad -d openclaw_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker compose exec -T postgres gunzip -c /tmp/rollback_backup.sql.gz | psql -U shad -d openclaw_db
    
    # Cleanup
    docker compose exec -T postgres rm -f /tmp/rollback_backup.sql.gz
    
    log_success "Database restored"
}

# --- Restart Services ---
restart_services() {
    log_info "Restarting services..."
    
    docker compose up -d
    
    # Wait for dashboard to start
    log_info "Waiting for dashboard to start..."
    sleep 10
    
    log_success "Services restarted"
}

# --- Verify Rollback ---
verify_rollback() {
    log_info "Verifying rollback..."
    
    # Check dashboard is responding
    if curl -sf http://localhost:3000/health &> /dev/null || curl -sf http://localhost:3000/api/health &> /dev/null; then
        log_success "Dashboard is responding"
    else
        log_warning "Dashboard may not be fully operational - check logs"
    fi
    
    # Show service status
    docker compose ps
}

# --- Main ---
main() {
    echo "============================================"
    echo "OpenClaw Ops - Rollback Script"
    echo "============================================"
    echo ""
    
    if [ "$VERSION" = "latest" ]; then
        log_info "Rolling back to latest backup"
    else
        log_info "Rolling back to version: $VERSION"
    fi
    echo ""
    
    preflight_checks
    backup_current_state
    restore_database
    restart_services
    verify_rollback
    
    echo ""
    echo "============================================"
    log_success "Rollback complete!"
    echo "============================================"
}

main "$@"
