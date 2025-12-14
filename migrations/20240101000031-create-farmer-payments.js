'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_payments', {
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
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      givenBy: {
        type: Sequelize.STRING,
        allowNull: false
      },
      receivedTo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('farmer_payments', ['projectId']);
    await queryInterface.addIndex('farmer_payments', ['isDeleted']);
    await queryInterface.addIndex('farmer_payments', ['date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_payments');
  }
};
