#!/usr/bin/env node

/**
 * Migration CLI Tool
 * 
 * Usage:
 *   node scripts/migrate-cli.js <command>
 * 
 * Commands:
 *   up         - Run all pending migrations
 *   down       - Rollback last migration
 *   status     - Check migration status
 *   help       - Show this help message
 */

const { runMigrations, rollbackMigration, checkMigrationStatus } = require('../utils/migrate');

const command = process.argv[2];

async function main() {
  console.log('🔧 Migration CLI Tool\n');
  
  try {
    switch (command) {
      case 'up':
      case 'run':
        console.log('📤 Running migrations...\n');
        await runMigrations();
        process.exit(0);
        break;
        
      case 'down':
      case 'rollback':
        console.log('📥 Rolling back migration...\n');
        await rollbackMigration();
        process.exit(0);
        break;
        
      case 'status':
      case 'check':
        console.log('📊 Checking migration status...\n');
        await checkMigrationStatus();
        process.exit(0);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Migration CLI Tool - Manage database migrations safely

USAGE:
  node scripts/migrate-cli.js <command>
  
COMMANDS:
  up, run         Run all pending migrations
  down, rollback  Rollback the last migration
  status, check   Check migration status
  help            Show this help message
  
EXAMPLES:
  node scripts/migrate-cli.js up
  node scripts/migrate-cli.js status
  node scripts/migrate-cli.js rollback
  
NPM SCRIPTS (recommended):
  npm run migrate:run      - Run migrations
  npm run migrate:check    - Check status
  npm run migrate:rollback - Rollback last migration
  npm run migrate:create   - Create new migration
  
For more information, see MIGRATION_GUIDE.md
  `);
}

// Run the CLI
main();


