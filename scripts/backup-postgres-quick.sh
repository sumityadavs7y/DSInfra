#!/bin/bash

###############################################################################
# Quick PostgreSQL Backup - Use with .env file
#
# This script loads database credentials from .env file
# Usage: ./scripts/backup-postgres-quick.sh
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env file if exists
if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${BLUE}ℹ️  Loading configuration from .env file...${NC}"
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Configuration
DB_NAME="${DB_NAME:-dsinfra}"
DB_USER="${DB_USER:-dsuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${HOME}/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="db_backup_${DB_NAME}_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║           PostgreSQL Quick Backup                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Database:${NC} $DB_NAME"
echo -e "${BLUE}User:${NC} $DB_USER"
echo -e "${BLUE}Host:${NC} $DB_HOST:$DB_PORT"
echo ""

# Check for password
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ DB_PASSWORD not set!${NC}"
    echo ""
    echo "Please set password in one of these ways:"
    echo ""
    echo "1. In .env file:"
    echo "   DB_PASSWORD=your_password"
    echo ""
    echo "2. As environment variable:"
    echo "   export DB_PASSWORD=your_password"
    echo "   ./scripts/backup-postgres-quick.sh"
    echo ""
    echo "3. Inline:"
    echo "   DB_PASSWORD=your_password ./scripts/backup-postgres-quick.sh"
    echo ""
    exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

# Check if pg_dump exists
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y postgresql-client
fi

# Create backup
echo -e "${BLUE}🔄 Creating backup...${NC}"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom --file="$BACKUP_PATH" 2>&1; then
    
    # Set permissions
    chmod 600 "$BACKUP_PATH"
    
    # Get size
    BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo ""
    echo "  📦 File: $BACKUP_NAME"
    echo "  📊 Size: $BACKUP_SIZE"
    echo "  📁 Path: $BACKUP_PATH"
    echo ""
    
    # Restore command
    echo -e "${BLUE}To restore:${NC}"
    echo "  pg_restore -U $DB_USER -d $DB_NAME -h $DB_HOST $BACKUP_PATH"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Cleanup old backups (keep last 30 days)
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "db_backup_*.dump" -mtime +30 2>/dev/null | wc -l)
if [ "$OLD_BACKUPS" -gt 0 ]; then
    echo -e "${BLUE}🗑️  Cleaning up $OLD_BACKUPS old backup(s)...${NC}"
    find "$BACKUP_DIR" -name "db_backup_*.dump" -mtime +30 -delete
fi

echo -e "${GREEN}✅ Done!${NC}"
echo ""

