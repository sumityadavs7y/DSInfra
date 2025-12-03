const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../config');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: databaseConfig.dialect,
  storage: databaseConfig.storage,
  logging: databaseConfig.logging,
  define: {
    timestamps: true, // Adds createdAt and updatedAt fields
    underscored: false, // Use camelCase instead of snake_case
  },
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// Sync database models
// Note: Using sync without alter to preserve data in SQLite
// alter: true can cause data loss in SQLite as it recreates tables
const syncDatabase = async (force = false) => {
  try {
    if (force) {
      // Only use force if explicitly requested (will delete all data!)
      await sequelize.sync({ force: true });
      console.log('✅ Database synchronized (FORCE - tables recreated).');
    } else {
      // Safe sync - only creates missing tables, doesn't alter existing ones
      await sequelize.sync();
      console.log('✅ Database synchronized successfully.');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase
};

