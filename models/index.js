const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
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

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    defaultValue: 'employee'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

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
    syncDatabase,
    // Models
    User
}; 