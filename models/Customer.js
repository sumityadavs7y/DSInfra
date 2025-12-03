const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

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

module.exports = Customer;

