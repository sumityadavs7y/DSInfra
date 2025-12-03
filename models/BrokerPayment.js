const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const BrokerPayment = sequelize.define('BrokerPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Auto-generated payment number'
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'brokers',
      key: 'id'
    }
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Amount paid to broker'
  },
  paymentMode: {
    type: DataTypes.ENUM('Cash', 'Cheque', 'Online Transfer', 'NEFT/RTGS', 'UPI', 'Other'),
    defaultValue: 'Cash'
  },
  transactionNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
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
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'broker_payments',
  timestamps: true,
  hooks: {
    beforeValidate: async (brokerPayment, options) => {
      if (!brokerPayment.paymentNo) {
        const year = new Date().getFullYear();
        const count = await BrokerPayment.count({ paranoid: false });
        brokerPayment.paymentNo = `BRP${year}${(count + 1).toString().padStart(5, '0')}`;
      }
    }
  }
});

module.exports = BrokerPayment;

