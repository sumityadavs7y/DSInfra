'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('broker_payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      paymentNo: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      paymentDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      brokerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'brokers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      paymentAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      paymentMode: {
        type: Sequelize.ENUM('Cash', 'Cheque', 'Online Transfer', 'NEFT/RTGS', 'UPI', 'Other'),
        defaultValue: 'Cash',
        allowNull: false
      },
      transactionNo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('broker_payments', ['paymentNo']);
    await queryInterface.addIndex('broker_payments', ['brokerId']);
    await queryInterface.addIndex('broker_payments', ['paymentDate']);
    await queryInterface.addIndex('broker_payments', ['isDeleted']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('broker_payments');
  }
};

