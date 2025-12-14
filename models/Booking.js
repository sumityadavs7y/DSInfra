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
    comment: 'Price Level Charges (percentage)'
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
  expectedRegistryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expected date for registry completion'
  },
  loan: {
    type: DataTypes.ENUM('N/A', 'Yes', 'No'),
    defaultValue: 'N/A',
    allowNull: false,
    comment: 'Loan status for the booking'
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
  associatePlcCommission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Associate PLC commission percentage'
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

// Virtual getter to calculate totalAmount at runtime
// Formula: totalAmount = (area × effectiveRate) + (area × effectiveRate × plc / 100)
Object.defineProperty(Booking.prototype, 'totalAmount', {
  get: function() {
    const area = parseFloat(this.area) || 0;
    const effectiveRate = parseFloat(this.effectiveRate) || 0;
    const plcPercent = parseFloat(this.plc) || 0;
    
    const baseAmount = area * effectiveRate;
    const plcAmount = baseAmount * (plcPercent / 100);
    return baseAmount + plcAmount;
  },
  enumerable: true,
  configurable: true
});

// Virtual getter to calculate brokerCommission at runtime
// Formula: brokerCommission = [(effectiveRate - associateRate) × area] + [associatePlcCommission% of (effectiveRate × area)]
Object.defineProperty(Booking.prototype, 'brokerCommission', {
  get: function() {
    // Only calculate if broker is assigned
    if (!this.brokerId) {
      return 0;
    }
    
    const area = parseFloat(this.area) || 0;
    const effectiveRate = parseFloat(this.effectiveRate) || 0;
    const associateRate = parseFloat(this.associateRate) || 0;
    const associatePlcPercent = parseFloat(this.associatePlcCommission) || 0;
    
    const baseAmount = area * effectiveRate;
    const baseCommission = (effectiveRate - associateRate) * area;
    const plcCommission = baseAmount * (associatePlcPercent / 100);
    
    return Math.max(0, baseCommission + plcCommission);
  },
  enumerable: true,
  configurable: true
});

// Virtual field to calculate remaining amount at runtime
Booking.prototype.getRemainingAmount = function() {
  return parseFloat(this.totalAmount || 0) - parseFloat(this.totalPaid || 0);
};

module.exports = Booking;

