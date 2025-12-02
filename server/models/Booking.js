const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  bookingDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Customer Details
  applicantName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fatherHusbandName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  aadhaarNo: {
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
  // Property Details
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
    allowNull: false
  },
  areaUnit: {
    type: DataTypes.STRING,
    defaultValue: 'sq.ft'
  },
  rate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  plc: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  effectiveRate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  // Booking Payment
  bookingAmount: {
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
  paymentRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Broker Details
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brokers',
      key: 'id'
    }
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  // Payment Tracking
  totalPaid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  // Status
  status: {
    type: DataTypes.ENUM('booked', 'payment_pending', 'completed', 'cancelled'),
    defaultValue: 'booked'
  },
  // Legal Details
  legalDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Additional Fields
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
  tableName: 'bookings',
  timestamps: true,
  hooks: {
    beforeCreate: async (booking) => {
      // Auto-generate booking number
      if (!booking.bookingNo) {
        const count = await Booking.count();
        const year = new Date().getFullYear();
        booking.bookingNo = `BK${year}${String(count + 1).padStart(5, '0')}`;
      }
      
      // Calculate effective rate
      if (booking.discountType === 'percentage') {
        booking.effectiveRate = parseFloat(booking.rate) - (parseFloat(booking.rate) * parseFloat(booking.discount) / 100);
      } else {
        booking.effectiveRate = parseFloat(booking.rate) - parseFloat(booking.discount);
      }
      
      // Calculate total amount
      booking.totalAmount = parseFloat(booking.effectiveRate) * parseFloat(booking.area) + parseFloat(booking.plc || 0);
      
      // Initialize total paid with booking amount
      booking.totalPaid = parseFloat(booking.bookingAmount);
      
      // Calculate remaining amount
      booking.remainingAmount = parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid);
    },
    beforeUpdate: (booking) => {
      // Recalculate if relevant fields changed
      if (booking.changed('discount') || booking.changed('rate') || booking.changed('area') || booking.changed('plc')) {
        if (booking.discountType === 'percentage') {
          booking.effectiveRate = parseFloat(booking.rate) - (parseFloat(booking.rate) * parseFloat(booking.discount) / 100);
        } else {
          booking.effectiveRate = parseFloat(booking.rate) - parseFloat(booking.discount);
        }
        
        booking.totalAmount = parseFloat(booking.effectiveRate) * parseFloat(booking.area) + parseFloat(booking.plc || 0);
        booking.remainingAmount = parseFloat(booking.totalAmount) - parseFloat(booking.totalPaid);
      }
    }
  }
});

module.exports = Booking;
