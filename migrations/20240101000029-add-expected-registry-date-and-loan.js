'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add expectedRegistryDate column
    await queryInterface.addColumn('bookings', 'expectedRegistryDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expected date for registry completion'
    });
    
    // Add loan column with ENUM
    await queryInterface.addColumn('bookings', 'loan', {
      type: Sequelize.ENUM('N/A', 'Yes', 'No'),
      allowNull: false,
      defaultValue: 'N/A',
      comment: 'Loan status for the booking'
    });
    
    console.log('✅ Added expectedRegistryDate and loan columns to bookings table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns
    await queryInterface.removeColumn('bookings', 'expectedRegistryDate');
    await queryInterface.removeColumn('bookings', 'loan');
    
    // Drop the ENUM type (PostgreSQL specific)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_loan";');
    
    console.log('✅ Removed expectedRegistryDate and loan columns from bookings table');
  }
};

