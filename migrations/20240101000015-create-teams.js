'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      teamNo: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        comment: 'Auto-generated team number'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Created teams table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('teams');
    console.log('✅ Dropped teams table');
  }
};

