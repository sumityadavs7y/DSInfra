const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../config');

// Initialize Sequelize with PostgreSQL or SQLite
const sequelizeConfig = {
  dialect: databaseConfig.dialect,
  logging: databaseConfig.logging,
  define: {
    timestamps: true, // Adds createdAt and updatedAt fields
    underscored: false, // Use camelCase instead of snake_case
  },
};

// Add PostgreSQL specific configuration
if (databaseConfig.dialect === 'postgres') {
  sequelizeConfig.host = databaseConfig.host;
  sequelizeConfig.port = databaseConfig.port;
  sequelizeConfig.database = databaseConfig.database;
  sequelizeConfig.username = databaseConfig.username;
  sequelizeConfig.password = databaseConfig.password;
  sequelizeConfig.pool = databaseConfig.pool;
  
  // PostgreSQL specific options
  sequelizeConfig.dialectOptions = {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  };
} else if (databaseConfig.dialect === 'sqlite') {
  // SQLite specific configuration
  sequelizeConfig.storage = databaseConfig.storage;
}

const sequelize = new Sequelize(sequelizeConfig);

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
// Note: For production, consider using migrations instead of sync
// alter: true can modify existing columns, force: true will drop all tables
const syncDatabase = async (force = false, alter = false) => {
  try {
    if (force) {
      // Only use force if explicitly requested (will delete all data!)
      await sequelize.sync({ force: true });
      console.log('✅ Database synchronized (FORCE - tables recreated).');
    } else if (alter) {
      // Alter existing tables to match models (may cause data loss)
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized (ALTER - tables updated).');
    } else {
      // Safe sync - only creates missing tables, doesn't alter existing ones
      await sequelize.sync();
      console.log('✅ Database synchronized successfully.');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase
};

