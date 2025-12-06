'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove remainingAmount column from bookings table
    await queryInterface.removeColumn('bookings', 'remainingAmount');
    console.log('✅ Removed remainingAmount column from bookings table');
    
    // Remove remainingAmount column from payments table (if exists)
    const paymentsTableInfo = await queryInterface.describeTable('payments');
    if (paymentsTableInfo.remainingAmount) {
      await queryInterface.removeColumn('payments', 'remainingAmount');
      console.log('✅ Removed remainingAmount column from payments table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Add remainingAmount column back to bookings table
    await queryInterface.addColumn('bookings', 'remainingAmount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Remaining amount to be paid (calculated at runtime)'
    });
    console.log('✅ Added remainingAmount column back to bookings table');
    
    // Add remainingAmount column back to payments table
    const paymentsTableInfo = await queryInterface.describeTable('payments');
    if (!paymentsTableInfo.remainingAmount) {
      await queryInterface.addColumn('payments', 'remainingAmount', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      });
      console.log('✅ Added remainingAmount column back to payments table');
    }
  }
};



