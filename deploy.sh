#!/bin/bash

# EC2 Deployment Script for Real Estate Management System
# This script should be run on the EC2 instance

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Real Estate Management System - Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
PROJECT_DIR="${PROJECT_DIR:-~/ds}"
BRANCH="${BRANCH:-master}"
APP_NAME="dsinfra"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Navigate to project directory
cd "$PROJECT_DIR" || {
    print_error "Failed to navigate to $PROJECT_DIR"
    exit 1
}
print_status "Changed to project directory: $PROJECT_DIR"

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Stash any local changes
print_status "Stashing local changes..."
git stash

# Fetch latest changes
print_status "Fetching latest changes from origin..."
git fetch origin

# Pull latest code
print_status "Pulling latest code from $BRANCH..."
git pull origin "$BRANCH"

# Install/update dependencies
print_status "Installing/updating dependencies..."
npm install --production

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_status "Created .env file. Please update it with your configuration."
    else
        print_warning "No .env.example found. Skipping .env creation."
    fi
fi

# Create necessary directories
mkdir -p database
mkdir -p uploads
print_status "Verified necessary directories exist"

# Set proper permissions
chmod -R 755 .
print_status "Set proper permissions"

# Restart application with PM2
print_status "Restarting application with PM2..."

# Check if PM2 process exists
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    print_status "Reloading existing PM2 process..."
    pm2 reload "$APP_NAME" --update-env
else
    print_status "Starting new PM2 process..."
    pm2 start index.js --name "$APP_NAME"
    pm2 startup
fi

# Save PM2 process list
pm2 save
print_status "PM2 process list saved"

# Display PM2 status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_status "Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "📋 Recent application logs:"
pm2 logs "$APP_NAME" --lines 20 --nostream

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_status "Useful PM2 commands:"
echo "  • View logs:    pm2 logs $APP_NAME"
echo "  • Stop app:     pm2 stop $APP_NAME"
echo "  • Restart app:  pm2 restart $APP_NAME"
echo "  • App status:   pm2 status"
echo "  • Monitor:      pm2 monit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

