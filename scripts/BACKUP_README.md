# PostgreSQL Backup Scripts

This folder contains scripts to backup your PostgreSQL database.

## 📦 Available Scripts

### 1. `backup-postgres-db.sh` (Recommended for Database Backup)
Uses `pg_dump` for logical database backup (RECOMMENDED).

**Features:**
- ✅ Logical backup (database content)
- ✅ Smaller backup size
- ✅ Easier to restore
- ✅ Can restore to different PostgreSQL version
- ✅ Compressed output
- ✅ No need to stop PostgreSQL

**Usage:**
```bash
# Set environment variables
export DB_NAME=dsinfra
export DB_USER=dsuser
export DB_PASSWORD=your_password

./scripts/backup-postgres-db.sh
```

### 2. `backup-postgres-quick.sh` (Quick Backup from .env)
Quick backup that loads credentials from .env file.

**Features:**
- ✅ Loads config from .env automatically
- ✅ No prompts (automated)
- ✅ Good for cron jobs
- ✅ Auto-cleanup of old backups (30+ days)
- ✅ Creates ~/backup directory automatically

**Usage:**
```bash
./scripts/backup-postgres-quick.sh
```

## 🎯 Which Script Should I Use?

### For Regular Backups (RECOMMENDED):
Use `backup-postgres-db.sh` - It's the PostgreSQL-recommended way to backup databases.

### For Quick Automated Backups:
Use `backup-postgres-quick.sh` if you have credentials in your .env file and want automatic cleanup

## 📝 Manual Usage

### Database Backup (Recommended)
```bash
./scripts/backup-postgres-db.sh
```

Output location: `~/backup/db_backup_dsinfra_YYYYMMDD_HHMMSS.dump`

### Quick Backup (from .env)
```bash
./scripts/backup-postgres-quick.sh
```

Output location: `~/backup/db_backup_dsinfra_YYYYMMDD_HHMMSS.dump`

## ⏰ Automated Backups (Cron)

### Setup Daily Backups

**For Database Backup (Recommended):**
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /workspaces/ds && ./scripts/backup-postgres-db.sh >> ~/backup/backup.log 2>&1
```

**For Quick Backup (from .env):**
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /workspaces/ds && ./scripts/backup-postgres-quick.sh >> ~/backup/backup.log 2>&1
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

### Restore Database Backup
```bash
# Using pg_restore (for .dump files)
pg_restore -U dsuser -d dsinfra ~/backup/db_backup_dsinfra_20240101_120000.dump

# Or with host and password
PGPASSWORD=your_password pg_restore -U dsuser -h localhost -d dsinfra ~/backup/db_backup_dsinfra_20240101_120000.dump
```

## 🗑️ Cleanup Old Backups

To keep only the last 7 days of backups:

```bash
# For database backups
find ~/backup -name "db_backup_*.dump" -mtime +7 -delete
```

Add to cron for automatic cleanup:
```bash
# Daily cleanup at 3 AM
0 3 * * * find ~/backup -name "db_backup_*.dump" -mtime +7 -delete
```

**Note:** `backup-postgres-quick.sh` automatically cleans up backups older than 30 days.

## 📊 Backup Size Estimation

**Database Backup (pg_dump):**
- Logical backup of specific database
- Size: Smaller, compressed (custom format)
- Only includes database content
- Typical size: 50-80% of actual database size

## ⚠️ Important Notes

### Database Backup (pg_dump):
1. **No need to stop PostgreSQL** - safe while running
2. **Smaller backups** - Only database content
3. **Easier to restore** - Standard PostgreSQL format
4. **Cross-version compatible** - Can restore to different versions
5. **Recommended approach** by PostgreSQL documentation

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

### "pg_dump command not found"
Install PostgreSQL client:
```bash
sudo apt-get install postgresql-client
```

### "Password authentication failed"
Make sure your credentials are correct:
```bash
export DB_PASSWORD=your_actual_password
./scripts/backup-postgres-db.sh
```

Or add them to your `.env` file for `backup-postgres-quick.sh`

### "Permission denied to backup directory"
Create the backup directory:
```bash
mkdir -p ~/backup
chmod 755 ~/backup
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

