const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const Broker = require('./Broker');
const Booking = require('./Booking');
const Payment = require('./Payment');
const Settings = require('./Settings');

// Define associations/relationships
Booking.belongsTo(Project, { 
  foreignKey: 'projectId', 
  as: 'project' 
});
Project.hasMany(Booking, { 
  foreignKey: 'projectId', 
  as: 'bookings' 
});

Booking.belongsTo(Broker, { 
  foreignKey: 'brokerId', 
  as: 'broker',
  constraints: false 
});
Broker.hasMany(Booking, { 
  foreignKey: 'brokerId', 
  as: 'bookings',
  constraints: false 
});

Booking.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  constraints: false 
});
User.hasMany(Booking, { 
  foreignKey: 'createdBy', 
  as: 'bookings',
  constraints: false 
});

Payment.belongsTo(Booking, { 
  foreignKey: 'bookingId', 
  as: 'booking' 
});
Booking.hasMany(Payment, { 
  foreignKey: 'bookingId', 
  as: 'payments' 
});

Payment.belongsTo(User, { 
  foreignKey: 'collectedBy', 
  as: 'collector',
  constraints: false 
});
User.hasMany(Payment, { 
  foreignKey: 'collectedBy', 
  as: 'payments',
  constraints: false 
});

Broker.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  constraints: false 
});
User.hasMany(Broker, { 
  foreignKey: 'createdBy', 
  as: 'brokers',
  constraints: false 
});

// Initialize database
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    // alter: true will update tables without dropping them
    // force: true will drop tables and recreate (use with caution!)
    await sequelize.sync({ alter: true });
    console.log('All models synchronized successfully.');
    
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Project,
  Broker,
  Booking,
  Payment,
  Settings,
  initializeDatabase
};

