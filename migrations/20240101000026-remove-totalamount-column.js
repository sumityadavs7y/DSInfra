'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove totalAmount column from bookings table
    // totalAmount is now calculated at runtime using a virtual getter
    await queryInterface.removeColumn('bookings', 'totalAmount');
    console.log('✅ Removed totalAmount column from bookings table - now calculated at runtime');
  },

  down: async (queryInterface, Sequelize) => {
    // Add totalAmount column back to bookings table
    await queryInterface.addColumn('bookings', 'totalAmount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total booking amount (calculated at runtime)'
    });
    console.log('✅ Added totalAmount column back to bookings table');
  }
};

