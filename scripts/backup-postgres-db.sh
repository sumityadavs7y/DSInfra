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
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="$HOME/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Try to get password from environment or .pgpass file
# Priority: 1. DB_PASSWORD env var, 2. PGPASSWORD env var, 3. .pgpass file
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
elif [ -z "$PGPASSWORD" ]; then
    # Check if .pgpass exists and has correct entry
    PGPASS_FILE="$HOME/.pgpass"
    if [ ! -f "$PGPASS_FILE" ]; then
        echo -e "${YELLOW}⚠️  No password set. Creating .pgpass file...${NC}"
        echo ""
        echo "Please enter database password:"
        read -s DB_PASSWORD
        echo ""
        
        # Create .pgpass file
        echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > "$PGPASS_FILE"
        chmod 600 "$PGPASS_FILE"
        echo -e "${GREEN}✅ Created .pgpass file for future authentications${NC}"
        echo ""
        export PGPASSWORD="$DB_PASSWORD"
    fi
fi

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

# pg_dump with compression (custom format is already compressed)
pg_dump -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --file="${BACKUP_PATH%.gz}" \
    --verbose 2>&1 | grep -v "^pg_dump:" || true

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
ls -lht "$BACKUP_DIR" | grep "db_backup" | head -5 || echo "  No previous backups found"
echo ""
