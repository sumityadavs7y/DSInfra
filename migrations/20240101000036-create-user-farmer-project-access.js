'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_farmer_project_access', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      farmer_project_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'farmer_projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('user_farmer_project_access', ['user_id']);
    await queryInterface.addIndex('user_farmer_project_access', ['farmer_project_id']);
    
    // Add unique constraint to prevent duplicate entries
    await queryInterface.addIndex('user_farmer_project_access', ['user_id', 'farmer_project_id'], {
      unique: true,
      name: 'unique_user_farmer_project'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_farmer_project_access');
  }
};
