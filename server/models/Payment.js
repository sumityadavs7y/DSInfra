const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receiptNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  receiptDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plotNo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  paymentMode: {
    type: DataTypes.ENUM('Cash', 'Cheque', 'Online Transfer', 'Card', 'UPI'),
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
  // Payment tracking
  previousPaid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  // Payment type
  paymentType: {
    type: DataTypes.ENUM('booking', 'installment', 'final'),
    defaultValue: 'installment'
  },
  // EMI details if applicable
  emiDetails: {
    type: DataTypes.JSON,
    defaultValue: {
      isEMI: false,
      installmentNumber: null,
      totalInstallments: null
    }
  },
  // Additional fields
  collectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('completed', 'pending', 'bounced'),
    defaultValue: 'completed'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  hooks: {
    beforeCreate: async (payment) => {
      // Auto-generate receipt number
      if (!payment.receiptNo) {
        const count = await Payment.count();
        const year = new Date().getFullYear();
        payment.receiptNo = `RC${year}${String(count + 1).padStart(5, '0')}`;
      }
    },
    afterCreate: async (payment) => {
      // Update booking after payment
      const Booking = require('./Booking');
      const booking = await Booking.findByPk(payment.bookingId);
      
      if (booking) {
        booking.totalPaid = parseFloat(booking.totalPaid) + parseFloat(payment.paymentAmount);
        booking.remainingAmount = parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid);
        
        if (booking.remainingAmount <= 0) {
          booking.status = 'completed';
        } else {
          booking.status = 'payment_pending';
        }
        
        await booking.save();
      }
    }
  }
});

module.exports = Payment;
