'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove balanceBeforePayment and balanceAfterPayment columns from payments table
    // These were storing incorrect/misleading data and are no longer needed
    
    await queryInterface.removeColumn('payments', 'balanceBeforePayment');
    await queryInterface.removeColumn('payments', 'balanceAfterPayment');
  },

  down: async (queryInterface, Sequelize) => {
    // If rollback is needed, recreate the columns (though they won't have the old data)
    
    await queryInterface.addColumn('payments', 'balanceBeforePayment', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Remaining balance before this payment (DEPRECATED - use booking.totalAmount - booking.totalPaid)'
    });
    
    await queryInterface.addColumn('payments', 'balanceAfterPayment', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Remaining balance after this payment (DEPRECATED - use booking.totalAmount - booking.totalPaid)'
    });
  }
};


