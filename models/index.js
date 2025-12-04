const { sequelize, Sequelize, testConnection, syncDatabase } = require('./sequelize');

// Import all models
const User = require('./User');
const Customer = require('./Customer');
const Broker = require('./Broker');
const BrokerDocument = require('./BrokerDocument');
const Project = require('./Project');
const Booking = require('./Booking');
const Payment = require('./Payment');
const BrokerPayment = require('./BrokerPayment');
const Team = require('./Team');
const TeamAssociate = require('./TeamAssociate');

// Define relationships
User.hasMany(Customer, { foreignKey: 'createdBy', as: 'customers' });
Customer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Project.hasMany(Booking, { foreignKey: 'projectId', as: 'bookings' });
Booking.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Customer.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Broker.hasMany(Booking, { foreignKey: 'brokerId', as: 'bookings' });
Booking.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });

User.hasMany(Broker, { foreignKey: 'createdBy', as: 'brokers' });
Broker.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Broker.hasMany(BrokerDocument, { foreignKey: 'brokerId', as: 'brokerDocuments' });
BrokerDocument.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });

User.hasMany(BrokerDocument, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' });
BrokerDocument.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(Booking, { foreignKey: 'createdBy', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

User.hasMany(Payment, { foreignKey: 'createdBy', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Broker.hasMany(BrokerPayment, { foreignKey: 'brokerId', as: 'payments' });
BrokerPayment.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });

User.hasMany(BrokerPayment, { foreignKey: 'createdBy', as: 'brokerPayments' });
BrokerPayment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Team relationships
User.hasMany(Team, { foreignKey: 'createdBy', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Many-to-many relationship between Team and Broker through TeamAssociate
Team.belongsToMany(Broker, { 
  through: TeamAssociate, 
  foreignKey: 'teamId', 
  otherKey: 'brokerId',
  as: 'associates' 
});
Broker.belongsToMany(Team, { 
  through: TeamAssociate, 
  foreignKey: 'brokerId', 
  otherKey: 'teamId',
  as: 'teams' 
});

// Direct access to join table
Team.hasMany(TeamAssociate, { foreignKey: 'teamId', as: 'teamAssociates' });
TeamAssociate.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });

Broker.hasMany(TeamAssociate, { foreignKey: 'brokerId', as: 'teamMemberships' });
TeamAssociate.belongsTo(Broker, { foreignKey: 'brokerId', as: 'associate' });

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase,
  // Models
  User,
  Customer,
  Broker,
  BrokerDocument,
  Project,
  Booking,
  Payment,
  BrokerPayment,
  Team,
  TeamAssociate
};
