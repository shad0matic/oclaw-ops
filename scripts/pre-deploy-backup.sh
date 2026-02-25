#!/bin/bash

# =============================================================================
# OpenClaw Ops - Pre-Deployment Backup Script
# =============================================================================
# Creates a backup before deploying new version
# Usage: ./pre-deploy-backup.sh
# =============================================================================

set -e

# --- Configuration ---
PROJECT_DIR="${PROJECT_DIR:-~/projects/oclaw-ops}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dashboard-$TIMESTAMP.tar.gz"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

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
echo "============================================"
echo "OpenClaw Ops - Pre-Deployment Backup"
echo "============================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup the dashboard directory (excluding node_modules, .next, dist)
log_info "Creating backup: $BACKUP_FILE"

cd "$PROJECT_DIR"

# Create tarball excluding large directories
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='test-results' \
    dashboard/

# Show backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Backup size: $SIZE"

# Also backup database
log_info "Backing up database..."
DB_BACKUP="$BACKUP_DIR/openclaw_db_predeploy_$TIMESTAMP.sql.gz"
if pg_dump -h localhost -U shad -d openclaw_db -F c | gzip > "$DB_BACKUP"; then
    DB_SIZE=$(du -h "$DB_BACKUP" | cut -f1)
    log_success "Database backup size: $DB_SIZE"
else
    log_error "Database backup failed, but continuing..."
fi

# Clean up old backups
log_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "dashboard-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "openclaw_db_predeploy_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List recent backups
echo ""
log_info "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5

echo ""
log_success "Backup complete: $BACKUP_FILE"
