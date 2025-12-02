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

// Define Customer model
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Auto-generated customer number'
  },
  applicantName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  fatherOrHusbandName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  aadhaarNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [12, 12]
    }
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'customers',
  timestamps: true
});

// Define Broker model
const Broker = sequelize.define('Broker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brokerNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Auto-generated broker number'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15]
    }
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
    allowNull: true,
    validate: {
      len: [12, 12]
    }
  },
  panNo: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 10]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  timestamps: true,
  hooks: {
    beforeValidate: async (broker, options) => {
      if (!broker.brokerNo) {
        const year = new Date().getFullYear();
        const count = await Broker.count({ paranoid: false });
        broker.brokerNo = `BRK${year}${(count + 1).toString().padStart(5, '0')}`;
      }
    }
  }
});

// Define Project model
const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalPlots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  availablePlots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'projects',
  timestamps: true
});

// Define Booking model
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
  // Booking Payment
  bookingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Initial booking amount paid'
  },
  paymentMode: {
    type: DataTypes.ENUM('Cash', 'Cheque', 'Online Transfer', 'UPI', 'Card'),
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
  // Status
  status: {
    type: DataTypes.ENUM('Active', 'Completed', 'Cancelled'),
    defaultValue: 'Active'
  },
  // Remaining amount
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Remaining amount to be paid'
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

// Define Payment model
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
  // Balance tracking
  balanceBeforePayment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Remaining balance before this payment'
  },
  balanceAfterPayment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Remaining balance after this payment'
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

User.hasMany(Booking, { foreignKey: 'createdBy', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

User.hasMany(Payment, { foreignKey: 'createdBy', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

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
    User,
    Customer,
    Broker,
    Project,
    Booking,
    Payment
}; 