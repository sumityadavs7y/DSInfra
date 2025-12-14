'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('farmer_registries', 'plotNumber', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'N/A' // For existing records
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('farmer_registries', 'plotNumber');
  }
};
