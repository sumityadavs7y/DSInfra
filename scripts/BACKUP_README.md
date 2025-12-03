# PostgreSQL Backup Scripts

This folder contains scripts to backup your PostgreSQL database.

## 📦 Available Scripts

### 1. `backup-postgres.sh` (Interactive)
Full-featured backup script with prompts and detailed output.

**Features:**
- ✅ Interactive confirmation
- ✅ Checks disk space
- ✅ Detailed progress and summary
- ✅ Creates ~/backup directory automatically
- ✅ Sets secure permissions (600)

**Usage:**
```bash
sudo ./scripts/backup-postgres.sh
```

### 2. `backup-postgres-simple.sh` (Non-Interactive)
Quick backup without prompts - perfect for cron jobs.

**Features:**
- ✅ No prompts (automated)
- ✅ Fast execution
- ✅ Good for cron jobs
- ✅ Creates ~/backup directory automatically

**Usage:**
```bash
sudo ./scripts/backup-postgres-simple.sh
```

### 3. `backup-postgres-db.sh` (Recommended for Database Backup)
Uses `pg_dump` for logical database backup (RECOMMENDED).

**Features:**
- ✅ Logical backup (database content)
- ✅ Smaller backup size
- ✅ Easier to restore
- ✅ Can restore to different PostgreSQL version
- ✅ Compressed output

**Usage:**
```bash
# Set environment variables
export DB_NAME=dsinfra
export DB_USER=dsuser
export DB_PASSWORD=your_password

./scripts/backup-postgres-db.sh
```

## 🎯 Which Script Should I Use?

### For Regular Backups (RECOMMENDED):
Use `backup-postgres-db.sh` - It's the PostgreSQL-recommended way to backup databases.

### For Full Data Directory Backup:
Use `backup-postgres.sh` or `backup-postgres-simple.sh` if you need to backup the entire data directory (includes all databases, WAL files, etc.)

## 📝 Manual Usage

### Interactive Backup (Data Directory)
```bash
sudo ./scripts/backup-postgres.sh
```

Output location: `~/backup/postgres_backup_YYYYMMDD_HHMMSS.zip`

### Automated Backup (Data Directory)
```bash
sudo ./scripts/backup-postgres-simple.sh
```

### Database Backup (Recommended)
```bash
./scripts/backup-postgres-db.sh
```

Output location: `~/backup/db_backup_dsinfra_YYYYMMDD_HHMMSS.sql.gz`

## ⏰ Automated Backups (Cron)

### Setup Daily Backups

**For Database Backup (Recommended):**
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /workspaces/ds && ./scripts/backup-postgres-db.sh >> ~/backup/backup.log 2>&1
```

**For Data Directory Backup:**
```bash
# Edit root crontab (requires sudo)
sudo crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /workspaces/ds && ./scripts/backup-postgres-simple.sh >> /root/backup/backup.log 2>&1
```

### Cron Schedule Examples

```bash
# Daily at 2 AM
0 2 * * * /path/to/script.sh

# Every 6 hours
0 */6 * * * /path/to/script.sh

# Weekly on Sunday at 3 AM
0 3 * * 0 /path/to/script.sh

# Every day at midnight
0 0 * * * /path/to/script.sh

# Twice a day (6 AM and 6 PM)
0 6,18 * * * /path/to/script.sh
```

## 🔄 Restore Backups

### Restore Data Directory Backup
```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Extract backup
sudo unzip ~/backup/postgres_backup_20240101_120000.zip -d /

# Start PostgreSQL
sudo systemctl start postgresql
```

### Restore Database Backup (Recommended)
```bash
# Using pg_restore
pg_restore -U dsuser -d dsinfra ~/backup/db_backup_dsinfra_20240101_120000.sql.gz

# Or using psql if plain SQL
gunzip -c ~/backup/db_backup_dsinfra_20240101_120000.sql.gz | psql -U dsuser -d dsinfra
```

## 🗑️ Cleanup Old Backups

To keep only the last 7 days of backups:

```bash
# For data directory backups
find ~/backup -name "postgres_backup_*.zip" -mtime +7 -delete

# For database backups
find ~/backup -name "db_backup_*.sql.gz" -mtime +7 -delete
```

Add to cron for automatic cleanup:
```bash
# Daily cleanup at 3 AM
0 3 * * * find ~/backup -name "postgres_backup_*.zip" -mtime +7 -delete
```

## 📊 Backup Size Estimation

**Data Directory Backup:**
- Full backup of `/var/lib/postgresql/16/main`
- Size: Typically 2-5x the database size
- Includes all databases, WAL files, config

**Database Backup (pg_dump):**
- Logical backup of specific database
- Size: Smaller, compressed
- Only includes database content

## ⚠️ Important Notes

### Data Directory Backup:
1. **Stop PostgreSQL** before backup for consistency:
   ```bash
   sudo systemctl stop postgresql
   # Run backup
   sudo systemctl start postgresql
   ```

2. **Requires root access** to read PostgreSQL data directory

3. **Large backups** - Can take significant time and space

### Database Backup:
1. **No need to stop PostgreSQL** - safe while running
2. **Smaller backups** - Only database content
3. **Easier to restore** - Standard PostgreSQL format
4. **Cross-version compatible** - Can restore to different versions

## 🔒 Security

All backup scripts:
- Set file permissions to `600` (owner read/write only)
- Store backups in user's home directory
- Never expose passwords in process list

For production:
- Store backups on separate disk/server
- Encrypt sensitive backups
- Use PostgreSQL's streaming replication
- Consider using pg_basebackup for hot backups

## 🆘 Troubleshooting

### "Permission denied"
Run with sudo for data directory backups:
```bash
sudo ./scripts/backup-postgres.sh
```

### "PostgreSQL data directory not found"
Update the path in the script:
```bash
POSTGRES_DATA_DIR="/var/lib/postgresql/16/main"
```

### "zip command not found"
Install zip:
```bash
sudo apt-get install zip
```

### "pg_dump command not found"
Install PostgreSQL client:
```bash
sudo apt-get install postgresql-client
```

## 📚 Related Documentation

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Manual](https://www.postgresql.org/docs/current/app-pgrestore.html)

## 📞 Support

For issues or questions about the backup scripts, check:
1. Script output for error messages
2. PostgreSQL logs: `/var/log/postgresql/`
3. Available disk space: `df -h`
4. PostgreSQL status: `sudo systemctl status postgresql`

