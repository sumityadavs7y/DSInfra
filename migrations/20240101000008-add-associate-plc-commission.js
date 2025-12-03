'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add associatePlcCommission column to bookings table
    await queryInterface.addColumn('bookings', 'associatePlcCommission', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Associate PLC commission percentage'
    });

    console.log('✅ Added associatePlcCommission column to bookings table');
  },

  async down(queryInterface, Sequelize) {
    // Remove associatePlcCommission column
    await queryInterface.removeColumn('bookings', 'associatePlcCommission');
    
    console.log('✅ Removed associatePlcCommission column from bookings table');
  }
};

