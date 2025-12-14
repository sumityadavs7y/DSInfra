'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('farmer_registries', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unknown' // For existing records
    });

    await queryInterface.addColumn('farmer_registries', 'remarks', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('farmer_registries', 'name');
    await queryInterface.removeColumn('farmer_registries', 'remarks');
  }
};
