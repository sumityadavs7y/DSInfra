'use strict';

/**
 * Migration: Add photo and documents columns to brokers table
 * 
 * This migration:
 * 1. Adds a photo column to store associate's photo as base64
 * 2. Adds a documents column to store multiple documents as JSON array
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Adding Photo & Documents to Brokers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const dialect = queryInterface.sequelize.getDialect();

    // Add photo column (store as TEXT for base64 encoded image)
    console.log('Adding photo column...');
    await queryInterface.addColumn('brokers', 'photo', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Base64 encoded photo'
    });

    // Add documents column (store as JSON array of objects with base64 data)
    console.log('Adding documents column...');
    if (dialect === 'postgres') {
      await queryInterface.addColumn('brokers', 'documents', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of documents with base64 data'
      });
    } else {
      // SQLite doesn't have JSONB, use TEXT
      await queryInterface.addColumn('brokers', 'documents', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of documents with base64 data'
      });
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - photo (TEXT): Store associate photo as base64');
    console.log('  - documents (JSONB/TEXT): Store multiple documents as JSON array\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('\n⚠️  Rolling back photo and documents columns...\n');
    
    await queryInterface.removeColumn('brokers', 'photo');
    await queryInterface.removeColumn('brokers', 'documents');
    
    console.log('✅ Rollback completed\n');
  }
};

