const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Auto-generated receipt number
  receiptNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  receiptDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Booking Reference
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  // Payment Details
  paymentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Payment amount received'
  },
  paymentMode: {
    type: DataTypes.ENUM('Cash', 'Cheque', 'Online Transfer', 'UPI', 'Card', 'EMI'),
    allowNull: false
  },
  transactionNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Payment Type
  paymentType: {
    type: DataTypes.ENUM('Booking', 'Installment', 'Final', 'Other'),
    defaultValue: 'Installment',
    comment: 'Type of payment'
  },
  // For EMI/Recurring Payments
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is this part of recurring payment'
  },
  installmentNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Installment number if recurring'
  },
  // Created by
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
  tableName: 'payments',
  timestamps: true
});

module.exports = Payment;

