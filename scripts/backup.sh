#!/bin/bash

# =============================================================================
# OpenClaw Ops - Database Backup Script
# =============================================================================
# Creates a backup of the OpenClaw database
# =============================================================================

set -e

# --- Configuration ---
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/openclaw_db_$TIMESTAMP.sql"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-openclaw_db}"
DB_USER="${DB_USER:-shad}"

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
echo "OpenClaw Ops - Database Backup"
echo "============================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump is not installed. Please install PostgreSQL client."
    exit 1
fi

# Create the backup
log_info "Creating backup: $BACKUP_FILE"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE"; then
    log_success "Backup created successfully"
else
    log_error "Backup failed"
    exit 1
fi

# Compress the backup
log_info "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Show backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Backup size: $SIZE"

# Clean up old backups
log_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "openclaw_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List recent backups
echo ""
log_info "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5

echo ""
log_success "Backup complete: $BACKUP_FILE"
