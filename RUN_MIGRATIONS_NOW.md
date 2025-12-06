# 🚀 Run Migrations to Fix Balance Issue

The balance column issue is caused by an old `totalPaid` column still existing in the database with stale data.

## Quick Fix - Run the Migration

Run this command to remove the problematic column:

```bash
npm run migrate:run
```

If that doesn't work due to database connection issues, try:

```bash
# Check your database connection first
cat .env | grep DB_

# Then run migration
node -e "require('./utils/migrate').runMigrations().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); })"
```

## What the Migration Does

The migration `20240101000025-remove-totalpaid-column-from-bookings.js` will:
1. Remove the `totalPaid` column from the `bookings` table
2. After this, balance will ALWAYS be calculated from actual payment records
3. No more stale or incorrect data!

## Alternative: Manual Database Command

If migrations won't run, you can manually execute:

### For PostgreSQL:
```sql
ALTER TABLE bookings DROP COLUMN IF EXISTS "totalPaid";
```

### For SQLite:
SQLite doesn't support DROP COLUMN easily, so you'd need to:
1. Create new table without the column
2. Copy data
3. Drop old table
4. Rename new table

(The migration handles this automatically)

## Verify It Worked

After running the migration:
1. Restart your server
2. Go to the bookings list page
3. The balance should now show correctly!
4. Check the console logs for debugging output

## Temporary Workaround

The code now forcefully overrides the `totalPaid` value at runtime, so even if the column exists, it should use the calculated value. But the proper fix is to run the migration.

