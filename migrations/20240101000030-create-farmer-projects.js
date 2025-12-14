'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
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

    // Add index
    await queryInterface.addIndex('farmer_projects', ['isDeleted']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_projects');
  }
};
