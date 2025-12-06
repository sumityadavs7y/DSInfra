'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if totalPaid column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('bookings');
    
    if (tableInfo.totalPaid) {
      await queryInterface.removeColumn('bookings', 'totalPaid');
      console.log('✅ Removed totalPaid column from bookings table');
      console.log('ℹ️  Total paid is now calculated at runtime from payment records');
    } else {
      console.log('ℹ️  totalPaid column does not exist in bookings table, skipping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // If rollback is needed, recreate the column
    // Note: Old data won't be restored - will need to recalculate
    
    const tableInfo = await queryInterface.describeTable('bookings');
    
    if (!tableInfo.totalPaid) {
      await queryInterface.addColumn('bookings', 'totalPaid', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total amount paid (DEPRECATED - calculated at runtime)'
      });
      console.log('✅ Added totalPaid column back to bookings table');
      console.log('⚠️  Column values will be 0 - need to recalculate from payments');
    }
  }
};

