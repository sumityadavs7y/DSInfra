'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove brokerCommission column from bookings table
    // brokerCommission is now calculated at runtime using a virtual getter
    await queryInterface.removeColumn('bookings', 'brokerCommission');
    console.log('✅ Removed brokerCommission column from bookings table - now calculated at runtime');
  },

  down: async (queryInterface, Sequelize) => {
    // Add brokerCommission column back to bookings table
    await queryInterface.addColumn('bookings', 'brokerCommission', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Commission amount for broker (calculated at runtime)'
    });
    console.log('✅ Added brokerCommission column back to bookings table');
  }
};

