'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'team_leader' value to the enum_users_role enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'team_leader';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating all references
    // For now, we'll leave this empty as it's safer to keep the enum value
  }
};
