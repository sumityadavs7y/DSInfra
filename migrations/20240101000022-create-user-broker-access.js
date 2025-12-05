'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_broker_access', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'user_id'
      },
      brokerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'brokers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'broker_id'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Add unique constraint to prevent duplicate associations
    await queryInterface.addConstraint('user_broker_access', {
      fields: ['user_id', 'broker_id'],
      type: 'unique',
      name: 'unique_user_broker_access'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('user_broker_access', ['user_id']);
    await queryInterface.addIndex('user_broker_access', ['broker_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_broker_access');
  }
};

