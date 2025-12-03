#!/bin/bash

###############################################################################
# Simple PostgreSQL Backup Script
# 
# Quick backup without interactive prompts - good for cron jobs
###############################################################################

set -e

# Configuration
POSTGRES_DATA_DIR="/var/lib/postgresql/16/main"
BACKUP_DIR="$HOME/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="postgres_backup_${TIMESTAMP}.zip"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Error: This script must be run as root or with sudo"
    exit 1
fi

# Check if PostgreSQL data directory exists
if [ ! -d "$POSTGRES_DATA_DIR" ]; then
    echo "❌ Error: PostgreSQL data directory not found: $POSTGRES_DATA_DIR"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "🔄 Creating backup: $BACKUP_NAME"
zip -r -q "$BACKUP_PATH" "$POSTGRES_DATA_DIR"

# Set permissions
chmod 600 "$BACKUP_PATH"

# Get size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo "✅ Backup completed: $BACKUP_PATH"
echo "📊 Size: $BACKUP_SIZE"

