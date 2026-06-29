#!/bin/bash
# Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
# PyLess SQLite Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup.sh
# Keeps last 7 backups

set -e

DB_DIR="${DB_DIR:-/app/data}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
DB_FILE="${DB_DIR}/pylesss.db"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="${BACKUP_DIR}/pylesss_${DATE}.db"

if [ ! -f "$DB_FILE" ]; then
    echo "[$(date)] ERROR: Database file not found: $DB_FILE"
    exit 1
fi

sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ERROR: Backup failed"
    exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "pylesss_*.db" -mtime +$KEEP_DAYS -delete 2>/dev/null
REMAINING=$(find "$BACKUP_DIR" -name "pylesss_*.db" | wc -l)
echo "[$(date)] Backups kept: $REMAINING"
