#!/bin/bash

###############################################################################
# PostgreSQL Data Directory Backup Script
#
# This script creates a compressed backup of the PostgreSQL data directory
# with a timestamp and stores it in the backup folder.
#
# Usage:
#   sudo ./scripts/backup-postgres.sh
#
# Note: Requires root/sudo access to read PostgreSQL data directory
###############################################################################

set -e  # Exit on error

# Configuration
POSTGRES_DATA_DIR="/var/lib/postgresql/16/main"
BACKUP_DIR="$HOME/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="postgres_backup_${TIMESTAMP}.zip"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     PostgreSQL Data Directory Backup Script           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "This script must be run as root or with sudo"
    echo "Usage: sudo ./scripts/backup-postgres.sh"
    exit 1
fi

# Check if PostgreSQL data directory exists
if [ ! -d "$POSTGRES_DATA_DIR" ]; then
    print_error "PostgreSQL data directory not found: $POSTGRES_DATA_DIR"
    print_info "Please check if PostgreSQL is installed and the path is correct"
    exit 1
fi

# Check if zip is installed
if ! command -v zip &> /dev/null; then
    print_error "zip command not found. Installing..."
    apt-get update && apt-get install -y zip
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    print_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    print_success "Backup directory created"
else
    print_info "Backup directory already exists: $BACKUP_DIR"
fi

# Get PostgreSQL data directory size
DATA_SIZE=$(du -sh "$POSTGRES_DATA_DIR" | cut -f1)
print_info "PostgreSQL data directory size: $DATA_SIZE"

# Check available disk space
AVAILABLE_SPACE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
print_info "Available disk space: $AVAILABLE_SPACE"

# Warning about PostgreSQL service
print_warning "For best results, stop PostgreSQL service before backup:"
print_warning "  sudo systemctl stop postgresql"
print_warning ""
read -p "Continue with backup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Backup cancelled"
    exit 0
fi

# Start backup
print_info "Starting backup..."
print_info "Source: $POSTGRES_DATA_DIR"
print_info "Destination: $BACKUP_PATH"
echo ""

# Create the backup
print_info "Compressing data directory (this may take a while)..."

# Use zip with progress indicator
if zip -r -q "$BACKUP_PATH" "$POSTGRES_DATA_DIR" 2>&1 | tee /tmp/backup_log.txt; then
    echo ""
    print_success "Backup completed successfully!"
    
    # Get backup file size
    BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    
    # Display summary
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                  Backup Summary                        ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "  📦 Backup File:    $BACKUP_NAME"
    echo "  📁 Location:       $BACKUP_DIR"
    echo "  📊 Backup Size:    $BACKUP_SIZE"
    echo "  📅 Timestamp:      $(date)"
    echo "  🔗 Full Path:      $BACKUP_PATH"
    echo ""
    
    # Set proper permissions
    chmod 600 "$BACKUP_PATH"
    print_success "Backup file permissions set to 600 (owner read/write only)"
    
    # List recent backups
    echo ""
    print_info "Recent backups in $BACKUP_DIR:"
    ls -lh "$BACKUP_DIR" | grep "postgres_backup" | tail -5
    
    echo ""
    print_success "Backup process completed!"
    print_info "To restore, extract: unzip $BACKUP_PATH"
    
else
    print_error "Backup failed!"
    exit 1
fi

# Cleanup log
rm -f /tmp/backup_log.txt

echo ""

