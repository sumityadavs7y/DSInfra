#!/bin/bash

###############################################################################
# PostgreSQL Database Logical Backup Script (RECOMMENDED)
#
# This script uses pg_dump to create a logical backup of the database
# This is the recommended way to backup PostgreSQL databases
#
# Usage:
#   ./scripts/backup-postgres-db.sh
#
# Note: This backs up the database content, not the data directory files
###############################################################################

set -e

# Configuration
DB_NAME="${DB_NAME:-dsinfra}"
DB_USER="${DB_USER:-dsuser}"
BACKUP_DIR="$HOME/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     PostgreSQL Database Logical Backup (pg_dump)      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}ℹ️  Database: $DB_NAME${NC}"
echo -e "${BLUE}ℹ️  User: $DB_USER${NC}"
echo -e "${BLUE}ℹ️  Backup: $BACKUP_NAME${NC}"
echo ""

# Check if pg_dump exists
if ! command -v pg_dump &> /dev/null; then
    echo -e "${YELLOW}⚠️  pg_dump not found. Installing PostgreSQL client...${NC}"
    sudo apt-get update && sudo apt-get install -y postgresql-client
fi

# Create backup
echo -e "${BLUE}🔄 Creating database backup...${NC}"

# pg_dump with compression
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST:-localhost}" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --file="${BACKUP_PATH%.gz}" \
    --verbose 2>&1 | grep -v "^pg_dump:"

# Compress if not using custom format
if [[ "$BACKUP_NAME" == *.gz ]]; then
    gzip -f "${BACKUP_PATH%.gz}"
fi

# Set permissions
chmod 600 "$BACKUP_PATH"

# Get size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo ""
echo "  📦 File:      $BACKUP_NAME"
echo "  📁 Location:  $BACKUP_DIR"
echo "  📊 Size:      $BACKUP_SIZE"
echo "  📅 Date:      $(date)"
echo ""
echo -e "${BLUE}ℹ️  To restore:${NC}"
echo "  pg_restore -U $DB_USER -d $DB_NAME $BACKUP_PATH"
echo ""

# List recent backups
echo -e "${BLUE}Recent backups:${NC}"
ls -lht "$BACKUP_DIR" | grep "db_backup" | head -5
echo ""

