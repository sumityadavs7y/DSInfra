const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Auto-generated booking number
  bookingNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  bookingDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Customer Reference
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  // Project Reference
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  plotNo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Area in sq. ft. or sq. meters'
  },
  plc: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Price Level Charges'
  },
  legalDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Rate per unit'
  },
  associateRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Associate rate per unit (for broker commission calculation)'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  effectiveRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Rate after discount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Total booking amount'
  },
  // Status
  status: {
    type: DataTypes.ENUM('Active', 'Cancelled'),
    defaultValue: 'Active'
  },
  // Registry Status
  registryCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the registry/registration of the property is completed'
  },
  registryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when registry was completed'
  },
  // Remaining amount (calculated from payments)
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Remaining amount to be paid (totalAmount - sum of payments)'
  },
  // Broker Reference (Optional - refers to Broker entity)
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brokers',
      key: 'id'
    }
  },
  brokerCommission: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Commission amount for broker'
  },
  // Created by user
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'bookings',
  timestamps: true
});

module.exports = Booking;

