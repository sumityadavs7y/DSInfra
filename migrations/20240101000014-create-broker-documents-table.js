'use strict';

/**
 * Migration: Create broker_documents table for storing associate documents
 * 
 * This provides a more robust solution than storing JSON in a single column
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Creating Broker Documents Table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await queryInterface.createTable('broker_documents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      brokerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'brokers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Original file name'
      },
      fileType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'MIME type of the file'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      fileData: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Base64 encoded file data'
      },
      uploadedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    console.log('✅ broker_documents table created successfully!\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('\n⚠️  Dropping broker_documents table...\n');
    await queryInterface.dropTable('broker_documents');
    console.log('✅ broker_documents table dropped\n');
  }
};

