# 🚀 Automated EC2 Deployment Setup

This project is configured for **automatic deployment to AWS EC2** whenever code is pushed to the `master` or `main` branch.

## 📚 Documentation Files

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide with detailed instructions
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick commands and troubleshooting tips
- **[deploy.sh](./deploy.sh)** - Deployment script (runs on EC2 during auto-deployment)
- **[ec2-setup.sh](./ec2-setup.sh)** - Initial EC2 setup script (run once)
- **[ecosystem.config.js](./ecosystem.config.js)** - PM2 process manager configuration

## ⚡ Quick Start

### Step 1: Setup EC2 Instance (One-Time)

SSH into your EC2 instance and run:

```bash
# Download setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/master/ec2-setup.sh

# Make it executable
chmod +x ec2-setup.sh

# Run the setup
./ec2-setup.sh
```

This script will:
- Install Node.js, Git, and PM2
- Clone your repository
- Setup the application
- Configure PM2 to run on system startup

### Step 2: Configure GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and Variables → Actions → New repository secret**

Add the following secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `EC2_HOST` | EC2 public IP or domain | `ec2-13-233-123-45.ap-south-1.compute.amazonaws.com` |
| `EC2_USERNAME` | SSH username | `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux) |
| `EC2_SSH_KEY` | Private SSH key | Full content of your `.pem` file |
| `EC2_PROJECT_PATH` | Project directory on EC2 | `/home/ubuntu/ds` |

#### How to get EC2_SSH_KEY:
```bash
# Display your PEM file content
cat ~/path/to/your-key.pem

# Copy the entire output including the BEGIN and END lines
```

### Step 3: Test Auto-Deployment

```bash
# Make any change to your code
echo "# Test deployment" >> test.txt

# Commit and push to master
git add .
git commit -m "Test auto-deployment"
git push origin master

# Watch the deployment in GitHub Actions
# Go to: Repository → Actions tab
```

## 🎯 How It Works

1. **Developer pushes code** to `master` or `main` branch
2. **GitHub Actions triggers** automatically
3. **Workflow connects to EC2** via SSH
4. **Deployment script runs:**
   - Pulls latest code
   - Installs dependencies
   - Restarts application with PM2
5. **Application is live** with zero downtime

## 🔧 Manual Deployment

If you need to deploy manually:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project directory
cd ~/ds

# Run the deployment script
./deploy.sh
```

## 📊 Monitoring Your Application

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs dsinfra

# Monitor resources
pm2 monit

# Restart application
pm2 restart dsinfra
```

## 🔒 Security Requirements

### EC2 Security Group Rules

Ensure your EC2 Security Group allows:

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | GitHub Actions IPs | For deployment |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web access |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web access |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | Node.js app (if not using Nginx) |

### Environment Variables

Create `.env` file on EC2 with:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-random-secret-key
AUTO_LOGIN=false
SAMPLE_DATA=false
```

## 🐛 Troubleshooting

### Deployment Failed?

**Check GitHub Actions logs:**
1. Go to GitHub → Actions tab
2. Click on the failed workflow
3. Review error messages

**Common Issues:**

| Issue | Solution |
|-------|----------|
| SSH Connection Failed | Verify EC2_HOST, check Security Group allows SSH |
| Permission Denied | Verify EC2_SSH_KEY is correct, check EC2_USERNAME |
| Git Pull Failed | SSH into EC2, manually run `git pull` |
| PM2 Not Found | SSH into EC2, run `sudo npm install -g pm2` |
| Port Already in Use | Check what's using port 3000: `sudo lsof -i :3000` |

### Check Application Health

```bash
# Test from EC2 instance
curl http://localhost:3000

# Test from outside
curl http://your-ec2-ip:3000

# View recent logs
pm2 logs dsinfra --lines 50
```

## 🔄 Rollback to Previous Version

If something goes wrong:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/ds

# View recent commits
git log --oneline -10

# Rollback to specific commit
git reset --hard COMMIT_HASH

# Restart application
pm2 restart dsinfra
```

## 🌐 Optional: Setup Nginx Reverse Proxy

For production, it's recommended to use Nginx:

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/dsinfra
```

Add this configuration:

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/dsinfra /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📋 Checklist Before Going Live

- [ ] EC2 instance is running and accessible
- [ ] Node.js, Git, and PM2 installed on EC2
- [ ] Repository cloned on EC2
- [ ] `.env` file configured with production values
- [ ] GitHub secrets configured correctly
- [ ] Security Group rules configured
- [ ] Test deployment successful
- [ ] Application accessible via browser
- [ ] PM2 startup script configured
- [ ] Nginx reverse proxy setup (optional)
- [ ] SSL certificate installed (optional)
- [ ] Database backups configured
- [ ] Monitoring/alerting setup

## 📞 Support

For detailed information, see:
- **Full Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

## 🎉 That's It!

Your application is now set up for automatic deployment. Every time you push to the master branch, your EC2 instance will automatically update! 

Happy deploying! 🚀

