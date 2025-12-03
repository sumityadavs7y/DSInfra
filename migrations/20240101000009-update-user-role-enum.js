'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // PostgreSQL: Need to alter the enum type
    // First, we'll use a raw query to update the enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'user';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This is a one-way migration
    console.log('Warning: Cannot remove enum value in PostgreSQL. Manual intervention required if rollback needed.');
  }
};

