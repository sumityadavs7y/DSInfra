'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'associate' value to the enum_users_role enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'associate';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This is a one-way migration
    console.log('Warning: Cannot remove enum value in PostgreSQL. Manual intervention required if rollback needed.');
  }
};

