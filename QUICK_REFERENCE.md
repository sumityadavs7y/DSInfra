# Quick Reference Guide - Auto-Deployment Setup

## 🚀 Quick Start (First Time Setup)

### 1. On Your EC2 Instance
```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/master/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### 2. On GitHub (Add Secrets)
Go to: Repository → Settings → Secrets and Variables → Actions

Add these secrets:
- `EC2_HOST` → Your EC2 public IP
- `EC2_USERNAME` → `ubuntu` (or `ec2-user`)
- `EC2_SSH_KEY` → Your PEM file content
- `EC2_PROJECT_PATH` → `/home/ubuntu/ds`

### 3. Test It
```bash
# Make a change, commit and push
git add .
git commit -m "Test deployment"
git push origin master
```

Watch it deploy automatically in GitHub Actions! 🎉

---

## 📋 GitHub Secrets Setup

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | EC2 Public IP or domain | `ec2-13-233-123-45.ap-south-1.compute.amazonaws.com` |
| `EC2_USERNAME` | SSH username | `ubuntu` or `ec2-user` |
| `EC2_SSH_KEY` | Private key content | Contents of your `.pem` file |
| `EC2_PROJECT_PATH` | Project directory path | `/home/ubuntu/ds` |
| `EC2_SSH_PORT` | SSH port (optional) | `22` |

### How to Get Your SSH Key:
```bash
# If you have the PEM file locally
cat ~/Downloads/your-key.pem

# Copy the entire output including:
# -----BEGIN RSA PRIVATE KEY-----
# ... key content ...
# -----END RSA PRIVATE KEY-----
```

---

## 🔧 Common PM2 Commands

```bash
# View application status
pm2 status

# View real-time logs
pm2 logs dsinfra

# View last 100 lines of logs
pm2 logs dsinfra --lines 100

# Monitor CPU/Memory
pm2 monit

# Restart application
pm2 restart dsinfra

# Stop application
pm2 stop dsinfra

# Start application
pm2 start dsinfra

# Delete process from PM2
pm2 delete dsinfra

# Save current PM2 process list
pm2 save

# Resurrect saved processes
pm2 resurrect

# View detailed info
pm2 info dsinfra

# Flush logs
pm2 flush

# Start with ecosystem file
pm2 start ecosystem.config.js
```

---

## 🐛 Troubleshooting

### Deployment Failed?

1. **Check GitHub Actions logs**
   - Go to GitHub → Actions tab
   - Click on the failed workflow
   - Review the error messages

2. **Common Issues:**

   **SSH Connection Failed:**
   ```bash
   # Verify EC2 is running
   # Check Security Group allows SSH (port 22)
   # Verify EC2_HOST and EC2_SSH_KEY are correct
   ```

   **Permission Denied:**
   ```bash
   # Ensure SSH key has correct format
   # Check EC2_USERNAME is correct (ubuntu vs ec2-user)
   ```

   **Git Pull Failed:**
   ```bash
   # SSH into EC2
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Navigate to project
   cd ~/ds
   
   # Check git status
   git status
   
   # Manually pull
   git pull origin master
   ```

   **Application Not Starting:**
   ```bash
   # Check PM2 logs
   pm2 logs dsinfra
   
   # Check if port is already in use
   sudo lsof -i :3000
   
   # Verify .env file exists
   ls -la /home/ubuntu/ds/.env
   ```

### Manual Deployment

If GitHub Actions fails, deploy manually:
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/ds

# Run deployment script
./deploy.sh
```

---

## 🔒 Security Checklist

- [ ] Changed SESSION_SECRET in .env
- [ ] Set AUTO_LOGIN=false in production
- [ ] Set SAMPLE_DATA=false in production
- [ ] Security Group allows only necessary ports
- [ ] SSH key is kept secure (not committed to repo)
- [ ] .env file is in .gitignore
- [ ] Using HTTPS (SSL/TLS configured)
- [ ] Regular system updates scheduled
- [ ] Database backups configured
- [ ] Monitoring/alerts set up

---

## 📊 Monitoring Your Application

### Check if Application is Running
```bash
curl http://localhost:3000
# Or from outside
curl http://your-ec2-ip:3000
```

### View System Resources
```bash
# CPU and Memory usage
pm2 monit

# System resources
htop
# (install with: sudo apt install htop)

# Disk space
df -h

# Check logs
tail -f logs/combined.log
```

### Application Health
```bash
# Check PM2 status
pm2 status

# Check uptime
pm2 info dsinfra | grep uptime

# Check restart count
pm2 info dsinfra | grep restart
```

---

## 🔄 Manual Rollback

If you need to revert to a previous version:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/ds

# View commit history
git log --oneline -10

# Rollback to specific commit
git reset --hard COMMIT_HASH

# Or rollback to previous commit
git reset --hard HEAD~1

# Restart application
pm2 restart dsinfra

# Verify
pm2 logs dsinfra
```

---

## 🌐 Nginx Setup (Optional but Recommended)

### Install Nginx
```bash
sudo apt update
sudo apt install -y nginx
```

### Configure Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/dsinfra
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/dsinfra /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 📞 Support Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PM2 version
pm2 --version

# Check Git version
git --version

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000

# Check all listening ports
sudo netstat -tlnp

# View environment variables
pm2 env 0

# Update PM2
sudo npm install -g pm2@latest
pm2 update
```

---

## 📝 Useful File Locations

```
/home/ubuntu/ds/              # Application directory
/home/ubuntu/ds/.env          # Environment variables
/home/ubuntu/ds/database/     # SQLite database
/home/ubuntu/ds/uploads/      # Uploaded files
/home/ubuntu/ds/logs/         # Application logs
~/.pm2/logs/                  # PM2 logs
/etc/nginx/                   # Nginx configuration
/var/log/nginx/               # Nginx logs
```

---

## 🎯 After Each Deployment

The GitHub Action automatically:
1. ✅ Pulls latest code
2. ✅ Installs dependencies
3. ✅ Restarts PM2 process
4. ✅ Shows deployment status

You can verify:
```bash
# Check latest commit
ssh ubuntu@your-ec2 "cd ~/ds && git log -1"

# Check application status
ssh ubuntu@your-ec2 "pm2 status"

# Test the application
curl http://your-ec2-ip:3000
```

---

**Quick Links:**
- Full Documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Setup Script: [ec2-setup.sh](./ec2-setup.sh)
- Deploy Script: [deploy.sh](./deploy.sh)
- PM2 Config: [ecosystem.config.js](./ecosystem.config.js)

