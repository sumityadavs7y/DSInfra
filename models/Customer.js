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
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  aadhaarNo: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: {
        args: [12, 12],
        msg: 'Aadhaar number must be exactly 12 digits'
      },
      isValidAadhaar(value) {
        if (value && !/^[0-9]{12}$/.test(value)) {
          throw new Error('Aadhaar number must be 12 digits');
        }
      }
    }
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: {
        args: [10, 15],
        msg: 'Mobile number must be between 10-15 digits'
      },
      isValidMobile(value) {
        if (value && !/^[0-9]{10,15}$/.test(value)) {
          throw new Error('Mobile number must be 10-15 digits');
        }
      }
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

