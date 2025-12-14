'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_registries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      serialNo: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'farmer_projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      registryDoneBy: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      rate: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      area: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
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

    // Add indexes
    await queryInterface.addIndex('farmer_registries', ['projectId']);
    await queryInterface.addIndex('farmer_registries', ['isDeleted']);
    await queryInterface.addIndex('farmer_registries', ['date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_registries');
  }
};
