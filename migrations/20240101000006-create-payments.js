'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      receiptNo: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      receiptDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      paymentAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paymentMode: {
        type: Sequelize.ENUM('Cash', 'Cheque', 'Online Transfer', 'UPI', 'Card', 'EMI'),
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
      paymentType: {
        type: Sequelize.ENUM('Booking', 'Installment', 'Final', 'Other'),
        defaultValue: 'Installment',
        allowNull: false
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      installmentNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      balanceBeforePayment: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      balanceAfterPayment: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
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
    await queryInterface.addIndex('payments', ['receiptNo']);
    await queryInterface.addIndex('payments', ['bookingId']);
    await queryInterface.addIndex('payments', ['receiptDate']);
    await queryInterface.addIndex('payments', ['isDeleted']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
  }
};


