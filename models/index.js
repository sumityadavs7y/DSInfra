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
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force, alter: !force });
        console.log('✅ Database synchronized successfully.');
    } catch (error) {
        console.error('❌ Error synchronizing database:', error);
    }
};

  module.exports = {
    sequelize,
    Sequelize,
    testConnection,
    syncDatabase
    // Models
  }; 