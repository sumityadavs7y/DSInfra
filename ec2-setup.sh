#!/bin/bash

# EC2 Initial Setup Script for Real Estate Management System
# Run this script once on your EC2 instance to set up the environment

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Real Estate Management System - EC2 Initial Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    print_error "Cannot detect OS"
    exit 1
fi

print_info "Detected OS: $OS"

# Update system packages
print_status "Updating system packages..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt update && sudo apt upgrade -y
elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
else
    print_warning "Unknown OS, skipping system update"
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 18.x..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    print_status "Node.js installed: $(node --version)"
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install Git if not installed
if ! command -v git &> /dev/null; then
    print_status "Installing Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y git
    elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        sudo yum install -y git
    fi
    print_status "Git installed: $(git --version)"
else
    print_status "Git already installed: $(git --version)"
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 globally..."
    sudo npm install -g pm2
    print_status "PM2 installed: $(pm2 --version)"
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup | grep sudo | bash || true

# Prompt for GitHub repository URL
echo ""
print_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " REPO_URL
read -p "Enter the branch name to use (default: master): " BRANCH
BRANCH=${BRANCH:-master}

# Set project directory
PROJECT_DIR="$HOME/ds"
read -p "Enter project directory path (default: $PROJECT_DIR): " USER_PROJECT_DIR
PROJECT_DIR=${USER_PROJECT_DIR:-$PROJECT_DIR}

# Clone repository
if [ -d "$PROJECT_DIR" ]; then
    print_warning "Directory $PROJECT_DIR already exists"
    read -p "Do you want to remove it and clone fresh? (y/N): " CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        rm -rf "$PROJECT_DIR"
        print_status "Removed existing directory"
    else
        print_info "Keeping existing directory. Will pull latest changes."
        cd "$PROJECT_DIR"
        git pull origin "$BRANCH"
    fi
fi

if [ ! -d "$PROJECT_DIR" ]; then
    print_status "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    git checkout "$BRANCH"
    print_status "Repository cloned successfully"
else
    cd "$PROJECT_DIR"
fi

# Install project dependencies
print_status "Installing project dependencies..."
npm install --production

# Setup .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        print_status "Creating .env file from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your configurations:"
        echo "  nano .env"
    else
        print_warning "No .env.example found. Creating basic .env file..."
        cat > .env << 'EOF'
PORT=3000
NODE_ENV=prod
SESSION_SECRET=change-this-to-a-random-secret-key
EOF
        print_status "Basic .env file created"
        print_warning "Please edit .env file with your configurations:"
        echo "  nano .env"
    fi
else
    print_status ".env file already exists"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p database uploads logs
chmod -R 755 .

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start index.js --name dsinfra
pm2 save

# Setup nginx reverse proxy (optional)
echo ""
print_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Do you want to setup Nginx reverse proxy? (y/N): " SETUP_NGINX
if [ "$SETUP_NGINX" = "y" ] || [ "$SETUP_NGINX" = "Y" ]; then
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        print_status "Installing Nginx..."
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt install -y nginx
        elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
            sudo yum install -y nginx
        fi
    fi

    # Get domain or use IP
    read -p "Enter your domain name (or press Enter to use server IP): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        DOMAIN=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "your-server-ip")
    fi

    # Create Nginx configuration
    print_status "Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/dsinfra > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable site
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo ln -sf /etc/nginx/sites-available/dsinfra /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
    fi

    # Test and restart Nginx
    sudo nginx -t && sudo systemctl restart nginx
    sudo systemctl enable nginx
    print_status "Nginx configured and started"
    
    print_info "Your application should now be accessible at: http://$DOMAIN"
fi

# Display final information
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Project Directory: $PROJECT_DIR"
print_info "Application Status:"
pm2 list
echo ""
print_info "Useful Commands:"
echo "  • View logs:      pm2 logs dsinfra"
echo "  • Restart app:    pm2 restart dsinfra"
echo "  • Stop app:       pm2 stop dsinfra"
echo "  • Monitor:        pm2 monit"
echo "  • Deploy script:  cd $PROJECT_DIR && ./deploy.sh"
echo ""
print_warning "Next Steps:"
echo "  1. Edit .env file: nano $PROJECT_DIR/.env"
echo "  2. Restart app:    pm2 restart dsinfra"
echo "  3. Setup GitHub Secrets (see DEPLOYMENT.md)"
echo "  4. Configure Security Group to allow HTTP/HTTPS"
echo ""
print_info "Documentation: $PROJECT_DIR/DEPLOYMENT.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

