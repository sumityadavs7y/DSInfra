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
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const EmployeeSalary = require('./EmployeeSalary');
const EmployeeDocument = require('./EmployeeDocument');
const UserBrokerAccess = require('./UserBrokerAccess');

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

// Employee relationships
User.hasMany(Employee, { foreignKey: 'createdBy', as: 'employees' });
Employee.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendanceRecords' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

User.hasMany(Attendance, { foreignKey: 'markedBy', as: 'markedAttendance' });
Attendance.belongsTo(User, { foreignKey: 'markedBy', as: 'marker' });

Employee.hasMany(EmployeeSalary, { foreignKey: 'employeeId', as: 'salaries' });
EmployeeSalary.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

User.hasMany(EmployeeSalary, { foreignKey: 'processedBy', as: 'processedSalaries' });
EmployeeSalary.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });

Employee.hasMany(EmployeeDocument, { foreignKey: 'employeeId', as: 'documents' });
EmployeeDocument.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

User.hasMany(EmployeeDocument, { foreignKey: 'uploadedBy', as: 'uploadedEmployeeDocuments' });
EmployeeDocument.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// User-Broker Access relationships (for associate role)
User.belongsToMany(Broker, {
  through: UserBrokerAccess,
  foreignKey: 'userId',
  otherKey: 'brokerId',
  as: 'accessibleBrokers'
});
Broker.belongsToMany(User, {
  through: UserBrokerAccess,
  foreignKey: 'brokerId',
  otherKey: 'userId',
  as: 'authorizedUsers'
});

// Direct access to join table
User.hasMany(UserBrokerAccess, { foreignKey: 'userId', as: 'brokerAccess' });
UserBrokerAccess.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Broker.hasMany(UserBrokerAccess, { foreignKey: 'brokerId', as: 'userAccess' });
UserBrokerAccess.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });

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
  TeamAssociate,
  Employee,
  Attendance,
  EmployeeSalary,
  EmployeeDocument,
  UserBrokerAccess
};
