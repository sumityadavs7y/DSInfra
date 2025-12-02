const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Broker = sequelize.define('Broker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  aadhaarNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  panNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  commissionType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  commissionValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalCommissionEarned: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  totalCommissionPaid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  remainingCommission: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  commissionHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of commission history objects with booking, amount, status, paidDate, remarks'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  bankDetails: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Bank details: accountName, accountNumber, bankName, ifscCode'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'brokers',
  timestamps: true
});

// Instance method to calculate remaining commission
Broker.prototype.calculateRemainingCommission = function() {
  this.remainingCommission = parseFloat(this.totalCommissionEarned) - parseFloat(this.totalCommissionPaid);
  return this.remainingCommission;
};

// Instance method to add commission
Broker.prototype.addCommission = function(bookingId, amount, remarks = '') {
  const history = this.commissionHistory || [];
  history.push({
    booking: bookingId,
    amount: amount,
    status: 'pending',
    paidDate: null,
    remarks: remarks,
    createdAt: new Date()
  });
  this.commissionHistory = history;
  this.totalCommissionEarned = parseFloat(this.totalCommissionEarned || 0) + parseFloat(amount);
  this.calculateRemainingCommission();
};

// Instance method to mark commission as paid
Broker.prototype.markCommissionPaid = function(bookingId, amount) {
  const history = this.commissionHistory || [];
  const commissionIndex = history.findIndex(h => h.booking === bookingId && h.status === 'pending');
  
  if (commissionIndex !== -1) {
    history[commissionIndex].status = 'paid';
    history[commissionIndex].paidDate = new Date();
    this.commissionHistory = history;
    this.totalCommissionPaid = parseFloat(this.totalCommissionPaid || 0) + parseFloat(amount);
    this.calculateRemainingCommission();
  }
};

module.exports = Broker;
