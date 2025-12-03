#!/bin/bash

###############################################################################
# Setup Automated PostgreSQL Backups
#
# This script sets up automated daily backups using cron
###############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     PostgreSQL Automated Backup Setup                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Choose backup type:${NC}"
echo "  1) Database backup (pg_dump) - RECOMMENDED"
echo "  2) Data directory backup (requires sudo)"
echo ""
read -p "Enter choice (1 or 2): " BACKUP_TYPE

if [ "$BACKUP_TYPE" == "1" ]; then
    SCRIPT_PATH="$SCRIPT_DIR/backup-postgres-db.sh"
    SCRIPT_NAME="backup-postgres-db.sh"
    NEEDS_SUDO=false
elif [ "$BACKUP_TYPE" == "2" ]; then
    SCRIPT_PATH="$SCRIPT_DIR/backup-postgres-simple.sh"
    SCRIPT_NAME="backup-postgres-simple.sh"
    NEEDS_SUDO=true
else
    echo -e "${YELLOW}Invalid choice. Exiting.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Choose backup schedule:${NC}"
echo "  1) Daily at 2:00 AM"
echo "  2) Daily at midnight"
echo "  3) Every 6 hours"
echo "  4) Weekly (Sunday at 3:00 AM)"
echo "  5) Custom"
echo ""
read -p "Enter choice (1-5): " SCHEDULE_TYPE

case $SCHEDULE_TYPE in
    1)
        CRON_SCHEDULE="0 2 * * *"
        SCHEDULE_DESC="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 0 * * *"
        SCHEDULE_DESC="Daily at midnight"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        SCHEDULE_DESC="Every 6 hours"
        ;;
    4)
        CRON_SCHEDULE="0 3 * * 0"
        SCHEDULE_DESC="Weekly on Sunday at 3:00 AM"
        ;;
    5)
        echo ""
        echo -e "${BLUE}Enter cron schedule (e.g., '0 2 * * *' for daily at 2 AM):${NC}"
        read -p "Schedule: " CRON_SCHEDULE
        SCHEDULE_DESC="Custom: $CRON_SCHEDULE"
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

# Create log directory
LOG_DIR="$HOME/backup"
mkdir -p "$LOG_DIR"

# Build cron command
if [ "$NEEDS_SUDO" == true ]; then
    CRON_CMD="$CRON_SCHEDULE cd $PROJECT_DIR && sudo $SCRIPT_PATH >> $LOG_DIR/backup.log 2>&1"
    CRON_USER="root"
else
    CRON_CMD="$CRON_SCHEDULE cd $PROJECT_DIR && $SCRIPT_PATH >> $LOG_DIR/backup.log 2>&1"
    CRON_USER="$USER"
fi

# Display summary
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  Configuration Summary                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "  Script:    $SCRIPT_NAME"
echo "  Schedule:  $SCHEDULE_DESC"
echo "  Log file:  $LOG_DIR/backup.log"
echo "  Cron user: $CRON_USER"
echo ""
echo "Cron entry:"
echo "  $CRON_CMD"
echo ""

read -p "Install this cron job? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
fi

# Install cron job
if [ "$NEEDS_SUDO" == true ]; then
    # Add to root crontab
    (sudo crontab -l 2>/dev/null || echo "") | grep -v "$SCRIPT_NAME" | { cat; echo "$CRON_CMD"; } | sudo crontab -
    echo -e "${GREEN}✅ Cron job installed in root crontab${NC}"
else
    # Add to user crontab
    (crontab -l 2>/dev/null || echo "") | grep -v "$SCRIPT_NAME" | { cat; echo "$CRON_CMD"; } | crontab -
    echo -e "${GREEN}✅ Cron job installed in user crontab${NC}"
fi

# Setup log rotation
echo ""
echo -e "${BLUE}Setting up log rotation...${NC}"

LOGROTATE_CONF="/etc/logrotate.d/postgres-backup"
sudo tee "$LOGROTATE_CONF" > /dev/null <<EOF
$LOG_DIR/backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF

echo -e "${GREEN}✅ Log rotation configured${NC}"

# Setup old backup cleanup
echo ""
echo -e "${BLUE}Setting up automatic cleanup (keep last 30 days)...${NC}"

CLEANUP_CMD="0 4 * * * find $LOG_DIR -name '*.zip' -mtime +30 -delete && find $LOG_DIR -name '*.gz' -mtime +30 -delete"

if [ "$NEEDS_SUDO" == true ]; then
    (sudo crontab -l 2>/dev/null || echo "") | grep -v "find $LOG_DIR" | { cat; echo "$CLEANUP_CMD"; } | sudo crontab -
else
    (crontab -l 2>/dev/null || echo "") | grep -v "find $LOG_DIR" | { cat; echo "$CLEANUP_CMD"; } | crontab -
fi

echo -e "${GREEN}✅ Automatic cleanup configured${NC}"

# Display installed cron jobs
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              Installation Complete!                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Automated backups are now configured!${NC}"
echo ""
echo "To verify cron jobs:"
if [ "$NEEDS_SUDO" == true ]; then
    echo "  sudo crontab -l"
else
    echo "  crontab -l"
fi
echo ""
echo "To test the backup manually:"
echo "  $SCRIPT_PATH"
echo ""
echo "To view backup logs:"
echo "  tail -f $LOG_DIR/backup.log"
echo ""
echo "Backup location:"
echo "  $LOG_DIR/"
echo ""

