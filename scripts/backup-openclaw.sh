#!/bin/bash
# OpenClaw backup script — daily local snapshots
# Backs up: config, workspace, agents, credentials, sessions/memory, cron, telegram state
# Keeps last 14 daily backups + last 4 weekly (Sunday) backups

set -euo pipefail

BACKUP_DIR="/home/shad/backups/openclaw"
OPENCLAW_DIR="/home/shad/.openclaw"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 7 = Sunday
BACKUP_FILE="$BACKUP_DIR/openclaw-$DATE.tar.gz"

mkdir -p "$BACKUP_DIR/weekly"

# Dump Postgres
PG_DUMP="$BACKUP_DIR/pg-$DATE.sql.gz"
if command -v pg_dump &>/dev/null; then
    pg_dump -h /var/run/postgresql openclaw_db | gzip > "$PG_DUMP"
    echo "🐘 Postgres dump: $PG_DUMP ($(du -h "$PG_DUMP" | cut -f1))"
fi

# Skip if today's backup already exists
if [[ -f "$BACKUP_FILE" ]]; then
    echo "Backup already exists: $BACKUP_FILE"
    exit 0
fi

# Create compressed backup (exclude media cache to save space)
tar czf "$BACKUP_FILE" \
    --exclude="$OPENCLAW_DIR/media/inbound" \
    --exclude="$OPENCLAW_DIR/media/outbound" \
    --exclude="$OPENCLAW_DIR/canvas" \
    --exclude="$OPENCLAW_DIR/completions" \
    -C /home/shad \
    .openclaw/openclaw.json \
    .openclaw/workspace \
    .openclaw/agents \
    .openclaw/credentials \
    .openclaw/memory \
    .openclaw/cron \
    .openclaw/telegram \
    .openclaw/identity \
    .openclaw/subagents \
    .openclaw/devices \
    2>/dev/null

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Copy Sunday backups to weekly
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/weekly/openclaw-weekly-$DATE.tar.gz"
    echo "📅 Weekly backup saved"
fi

# Prune: keep last 14 daily
cd "$BACKUP_DIR"
ls -1t openclaw-20*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t pg-20*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

# Prune: keep last 4 weekly
cd "$BACKUP_DIR/weekly"
ls -1t openclaw-weekly-*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm -f

echo "🧹 Pruned old backups"
